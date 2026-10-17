// Pip, the little sprout hero. Feet are at (x, y).
import { GROUND } from '../config';
import type { SimEvent } from './events';
import type { InputFrame } from './input';
import { clamp, type Circle, type Rect } from './math';
import { Projectile } from './projectile';

const SPEED = 290,
  ACCEL = 2400,
  FRICTION = 2800,
  JUMP_V = 640,
  GRAV_HOLD = 1350, // lighter gravity while the jump button is held on the way up: hold = higher
  GRAV = 2300;
const SHOT_SPEED = 640,
  SHOT_COOLDOWN = 0.17;
const JUMP_BUFFER = 0.1; // a jump pressed this long before landing still happens
// His hitbox is a circle this far above his feet. Forgiving: smaller than the sprite.
const HIT_UP = 22,
  HIT_R = 14;
// Pip never goes below the ground, so nothing under this line can touch him.
export const PIP_LOWEST = GROUND - HIT_UP + HIT_R;
// The box he takes up when walking into or landing on something solid: half its width, and its height.
export const BODY_HALF = 12,
  BODY_H = 46;

// What Pip needs from the level he is in: how far he can walk, what he can land on, where his seeds go and
// who hears about what he does. A boss fight is one (fight.ts).
export interface PlayerWorld {
  readonly minX: number; // the range his feet stay in
  readonly maxX: number;
  readonly platforms: readonly Rect[]; // one-way: he lands on them from above and jumps up through them
  // Boxes he stands on and walks into: on a stage, the ground in stretches (the gaps are pits) and logs.
  // Without them, the floor is a boss arena's: flat, everywhere, at GROUND.
  readonly solids?: readonly Rect[];
  readonly projectiles: Projectile[];
  emit(e: SimEvent): void;
}

export class Player {
  x = 150;
  y = GROUND;
  px = 150; // position one step ago, for smooth drawing between steps
  py = GROUND;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  onGround = true;
  coyote = 0; // seconds left in which a jump still works after walking off an edge
  jumpBuffer = 0; // seconds left in which an early jump press is still remembered
  jumpHeld = false;
  hp = 5;
  maxHp = 5;
  hits = 0;
  inv = 0; // seconds of invulnerability left
  hurtT = 0;
  alive = true;
  shootCd = 0;
  // The rest only drives how Pip is drawn.
  aimUp = false;
  recoil = 0;
  runT = 0;
  sq = 1; // squash and stretch: 1 = normal
  t = 0;

  constructor(private world: PlayerWorld) {}

  get hitbox(): Circle {
    return { x: this.x, y: this.y - HIT_UP, r: HIT_R };
  }

  update(dt: number, input: InputFrame) {
    const w = this.world;
    this.t += dt;
    this.inv = Math.max(0, this.inv - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shootCd -= dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);

    const ctrl = this.alive;
    this.aimUp = ctrl && input.up;
    const ax = ctrl ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (ax) {
      this.vx += ax * ACCEL * dt;
      this.facing = ax > 0 ? 1 : -1;
      if (this.onGround) this.runT += dt * 14;
    } else {
      const s = Math.sign(this.vx);
      this.vx -= s * Math.min(Math.abs(this.vx), FRICTION * dt);
    }
    this.vx = clamp(this.vx, -SPEED, SPEED);

    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (input.jumpPressed) this.jumpBuffer = JUMP_BUFFER;
    if (ctrl && this.jumpBuffer > 0 && (this.onGround || this.coyote > 0)) {
      this.jumpBuffer = 0;
      this.vy = -JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpHeld = true;
      this.sq = 1.35;
      w.emit({ type: 'jump', x: this.x, y: this.y });
    }
    if (!input.jump) this.jumpHeld = false;
    this.vy = Math.min(this.vy + (this.vy < 0 && this.jumpHeld ? GRAV_HOLD : GRAV) * dt, 1000);

    const prevX = this.x,
      prevY = this.y;
    this.x = clamp(this.x + this.vx * dt, w.minX, w.maxX);
    this.y += this.vy * dt;
    const wasGround = this.onGround;
    this.onGround = false;
    if (w.solids) {
      this.collideSolids(w.solids, prevX, prevY);
    } else if (this.y >= GROUND) {
      this.y = GROUND;
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy >= 0) {
      for (const p of w.platforms) if (this.landsOn(p, prevY)) this.land(p.y);
    }
    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    if (this.onGround && !wasGround) {
      this.sq = 0.7;
      w.emit({ type: 'land', x: this.x, y: this.y });
    }

    if (ctrl && input.shoot && this.shootCd <= 0) {
      this.shootCd = SHOT_COOLDOWN;
      this.recoil = 1;
      const up = input.up,
        d = this.facing,
        s = up ? SHOT_SPEED * 0.72 : SHOT_SPEED;
      w.projectiles.push(
        new Projectile({
          x: this.x + d * 20,
          y: this.y - 28 - (up ? 10 : 0),
          vx: d * s,
          vy: up ? -s : 0,
          r: 7,
          owner: 'player',
          kind: 'sprout',
          life: 1.8,
        }),
      );
      w.emit({ type: 'shoot' });
    }
    this.sq += (1 - this.sq) * Math.min(1, dt * 9);
  }

  // One-way platforms: he lands on one only when falling onto it from above.
  private landsOn(p: Rect, prevY: number) {
    return this.x > p.x - 4 && this.x < p.x + p.w + 4 && prevY <= p.y + 0.01 && this.y >= p.y;
  }
  private land(y: number) {
    this.y = y;
    this.vy = 0;
    this.onGround = true;
  }

  // Walking into and landing on solid boxes. Sideways first, measured from where his feet were, so standing
  // on a box never counts as walking into it; then up and down, landing on the highest top he fell past.
  private collideSolids(solids: readonly Rect[], prevX: number, prevY: number) {
    const across = (s: Rect) => this.x + BODY_HALF > s.x && this.x - BODY_HALF < s.x + s.w;
    for (const s of solids) {
      if (!across(s) || prevY <= s.y || prevY - BODY_H >= s.y + s.h) continue;
      this.x = prevX < s.x + s.w / 2 ? s.x - BODY_HALF : s.x + s.w + BODY_HALF;
      this.vx = 0;
    }
    let top = Infinity;
    for (const s of solids) {
      if (!across(s)) continue;
      if (this.vy >= 0 && prevY <= s.y + 0.01 && this.y >= s.y) top = Math.min(top, s.y);
      else if (this.vy < 0 && prevY - BODY_H >= s.y + s.h - 0.01 && this.y - BODY_H < s.y + s.h) {
        this.y = s.y + s.h + BODY_H; // bumped his head
        this.vy = 0;
      }
    }
    if (this.vy >= 0)
      for (const p of this.world.platforms) if (this.landsOn(p, prevY)) top = Math.min(top, p.y);
    if (top < Infinity) this.land(top);
  }

  // fromX: where the hit came from, if the hazard knows, to knock Pip away from it. Otherwise he is knocked
  // back the way he is facing from.
  hurt(fromX?: number): boolean {
    if (this.inv > 0 || !this.alive) return false;
    this.hp--;
    this.hits++;
    this.inv = 1.6;
    this.hurtT = 0.5;
    this.vy = -280;
    this.vx = (fromX === undefined ? -this.facing : this.x < fromX ? -1 : 1) * 160;
    this.sq = 0.8;
    this.world.emit({ type: 'playerHurt', x: this.x, y: this.y - 24 });
    if (this.hp <= 0) this.alive = false;
    return true;
  }
}
