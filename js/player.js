// Pip, the little sprout hero. Feet are at (x, y); the sprite is drawn upward from there.
import { ARENA_R, GROUND, clamp, circle, ellipse, roundRect, fillStroke, drawFace } from './utils.js';
import { input } from './input.js';
import { sfx } from './audio.js';
import { Projectile } from './entities.js';

const SPEED = 290, ACCEL = 2400, FRICTION = 2800, JUMP_V = 640, GRAV_HOLD = 1350, GRAV = 2300;
const SHOT_SPEED = 640, SHOT_COOLDOWN = 0.17;
const DUST = { n: 6, color: '#e8d6b3', speed: 80, size: 3, life: 0.35, gravity: 200, dir: -Math.PI / 2, spread: Math.PI };

export class Player {
  constructor(game) {
    this.game = game; this.x = 150; this.y = GROUND; this.vx = 0; this.vy = 0; this.facing = 1;
    this.onGround = true; this.coyote = 0; this.jumpHeld = false;
    this.hp = 5; this.maxHp = 5; this.hits = 0; this.inv = 0; this.hurtT = 0; this.alive = true; this.frozen = false;
    this.shootCd = 0; this.recoil = 0; this.runT = 0; this.sq = 1; this.blink = 3; this.t = 0;
  }
  get hitbox() { return { x: this.x, y: this.y - 22, r: 14 }; } // forgiving: smaller than the sprite

  update(dt) {
    const g = this.game;
    this.t += dt; this.inv = Math.max(0, this.inv - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.shootCd -= dt; this.recoil = Math.max(0, this.recoil - dt * 6);
    this.blink -= dt; if (this.blink < -0.12) this.blink = 2 + Math.random() * 3;

    const ctrl = this.alive && !this.frozen;
    const ax = ctrl ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (ax) { this.vx += ax * ACCEL * dt; this.facing = ax; if (this.onGround) this.runT += dt * 14; }
    else { const s = Math.sign(this.vx); this.vx -= s * Math.min(Math.abs(this.vx), FRICTION * dt); }
    this.vx = clamp(this.vx, -SPEED, SPEED);

    if (ctrl && input.pressed('jump') && (this.onGround || this.coyote > 0)) {
      this.vy = -JUMP_V; this.onGround = false; this.coyote = 0; this.jumpHeld = true; this.sq = 1.35;
      sfx.jump(); g.particles.burst(this.x, this.y, DUST);
    }
    if (!input.jump) this.jumpHeld = false;
    this.vy = Math.min(this.vy + (this.vy < 0 && this.jumpHeld ? GRAV_HOLD : GRAV) * dt, 1000);

    const prevY = this.y;
    this.x = clamp(this.x + this.vx * dt, 24, ARENA_R); this.y += this.vy * dt;
    const wasGround = this.onGround; this.onGround = false;
    if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; this.onGround = true; }
    else if (this.vy >= 0) for (const p of g.platforms) { // one-way platforms: land only when falling from above
      if (this.x > p.x - 4 && this.x < p.x + p.w + 4 && prevY <= p.y + 0.01 && this.y >= p.y) { this.y = p.y; this.vy = 0; this.onGround = true; }
    }
    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    if (this.onGround && !wasGround) { this.sq = 0.7; sfx.land(); g.particles.burst(this.x, this.y, DUST); }

    if (ctrl && (input.shoot || input.autoFire) && this.shootCd <= 0) {
      this.shootCd = SHOT_COOLDOWN; this.recoil = 1;
      const up = input.up || input.aimLock, d = this.facing, s = up ? SHOT_SPEED * 0.72 : SHOT_SPEED;
      g.projectiles.push(new Projectile({ x: this.x + d * 20, y: this.y - 28 - (up ? 10 : 0), vx: d * s, vy: up ? -s : 0, r: 7, owner: 'player', kind: 'sprout', life: 1.8 }));
      sfx.shoot();
    }
    this.sq += (1 - this.sq) * Math.min(1, dt * 9);
  }

  hurt() {
    if (this.inv > 0 || !this.alive) return false;
    this.hp--; this.hits++; this.inv = 1.6; this.hurtT = 0.5; this.vy = -280; this.vx = -this.facing * 160; this.sq = 0.8;
    sfx.hurt(); this.game.shake = 9;
    this.game.particles.burst(this.x, this.y - 24, { n: 7, color: '#ff9bb0', speed: 150, size: 5, life: 0.6, gravity: 250, shape: 'heart' });
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  draw(ctx) {
    const inAir = !this.onGround;
    const sh = clamp(1 - (GROUND - this.y) / 500, 0.4, 1);
    ctx.fillStyle = 'rgba(60,40,20,0.18)'; ellipse(ctx, this.x, GROUND + 3, 18 * sh, 5 * sh); ctx.fill();
    ctx.save();
    if (this.inv > 0 && this.alive && Math.floor(this.inv * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing * (1 + (1 - this.sq) * 0.8), this.sq);
    if (!this.alive) ctx.rotate(-0.35);
    const run = this.onGround && Math.abs(this.vx) > 30, bob = run ? Math.abs(Math.sin(this.runT)) * 3 : 0;
    const step = run ? Math.sin(this.runT) * 7 : 0;
    for (const [fx, ph] of [[-8, 1], [8, -1]]) {
      ellipse(ctx, fx + step * ph, -3 - (run ? Math.max(0, Math.sin(this.runT) * ph) * 4 : 0), 8, 5); fillStroke(ctx, '#5aa64a', '#3f8a33', 2.5);
    }
    ctx.translate(0, -bob);
    ellipse(ctx, 0, -26, 21, 24); fillStroke(ctx, '#a5e37f', '#4f9d3d', 3.2);
    ellipse(ctx, -6, -32, 8, 11, 0.3); fillStroke(ctx, 'rgba(255,255,255,0.35)', null);
    const wig = Math.sin(this.t * 6) * 0.15 + (inAir ? 0.35 : 0);
    ctx.strokeStyle = '#4f9d3d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -49); ctx.quadraticCurveTo(1, -56, 0, -62); ctx.stroke();
    ellipse(ctx, -9, -62, 10, 5.5, -0.7 - wig); fillStroke(ctx, '#7ccf63', '#4f9d3d', 2.5);
    ellipse(ctx, 9, -62, 10, 5.5, 0.7 + wig); fillStroke(ctx, '#7ccf63', '#4f9d3d', 2.5);
    const mood = this.hurtT > 0 ? 'hurt' : !this.alive ? 'sleepy' : inAir ? 'surprised' : 'happy';
    drawFace(ctx, 3, -28, 0.95, mood, this.blink < 0);
    const hx = 17 - this.recoil * 5; // hand + acorn-cap seed blaster
    circle(ctx, hx, -22, 6); fillStroke(ctx, '#a5e37f', '#4f9d3d', 2.5);
    roundRect(ctx, hx + 2, -28, 12, 11, 4); fillStroke(ctx, '#c58a5a', '#7a4e2c', 2.5);
    ctx.restore();
  }
}
