// Pip, the little sprout hero. Feet are at (x, y).
import { ARENA_R, GROUND } from '../config';
import type { Fight } from './fight';
import type { InputFrame } from './input';
import { clamp, type Circle } from './math';
import { Projectile } from './projectile';

const SPEED = 290,
  ACCEL = 2400,
  FRICTION = 2800,
  JUMP_V = 640,
  GRAV_HOLD = 1350, // lighter gravity while the jump button is held on the way up: hold = higher
  GRAV = 2300;
const SHOT_SPEED = 640,
  SHOT_COOLDOWN = 0.17;

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
  jumpHeld = false;
  hp = 5;
  maxHp = 5;
  hits = 0;
  inv = 0; // seconds of invulnerability left
  hurtT = 0;
  alive = true;
  shootCd = 0;
  // The rest only drives how Pip is drawn.
  recoil = 0;
  runT = 0;
  sq = 1; // squash and stretch: 1 = normal
  t = 0;

  constructor(private fight: Fight) {}

  // Forgiving: smaller than the sprite.
  get hitbox(): Circle {
    return { x: this.x, y: this.y - 22, r: 14 };
  }

  update(dt: number, input: InputFrame) {
    const f = this.fight;
    this.t += dt;
    this.inv = Math.max(0, this.inv - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shootCd -= dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);

    const ctrl = this.alive;
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

    if (ctrl && input.jumpPressed && (this.onGround || this.coyote > 0)) {
      this.vy = -JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpHeld = true;
      this.sq = 1.35;
      f.emit({ type: 'jump', x: this.x, y: this.y });
    }
    if (!input.jump) this.jumpHeld = false;
    this.vy = Math.min(this.vy + (this.vy < 0 && this.jumpHeld ? GRAV_HOLD : GRAV) * dt, 1000);

    const prevY = this.y;
    this.x = clamp(this.x + this.vx * dt, 24, ARENA_R);
    this.y += this.vy * dt;
    const wasGround = this.onGround;
    this.onGround = false;
    if (this.y >= GROUND) {
      this.y = GROUND;
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy >= 0) {
      // one-way platforms: land only when falling from above
      for (const p of f.platforms) {
        if (this.x > p.x - 4 && this.x < p.x + p.w + 4 && prevY <= p.y + 0.01 && this.y >= p.y) {
          this.y = p.y;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }
    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    if (this.onGround && !wasGround) {
      this.sq = 0.7;
      f.emit({ type: 'land', x: this.x, y: this.y });
    }

    if (ctrl && input.shoot && this.shootCd <= 0) {
      this.shootCd = SHOT_COOLDOWN;
      this.recoil = 1;
      const up = input.up,
        d = this.facing,
        s = up ? SHOT_SPEED * 0.72 : SHOT_SPEED;
      f.projectiles.push(
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
      f.emit({ type: 'shoot' });
    }
    this.sq += (1 - this.sq) * Math.min(1, dt * 9);
  }

  hurt(): boolean {
    if (this.inv > 0 || !this.alive) return false;
    this.hp--;
    this.hits++;
    this.inv = 1.6;
    this.hurtT = 0.5;
    this.vy = -280;
    this.vx = -this.facing * 160;
    this.sq = 0.8;
    this.fight.emit({ type: 'playerHurt', x: this.x, y: this.y - 24 });
    if (this.hp <= 0) this.alive = false;
    return true;
  }
}
