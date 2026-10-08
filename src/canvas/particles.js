// Temporary Canvas 2D particles, moved from the original game. Replaced by src/game/fx.ts in M2.
import { TAU } from '../config';
import { ellipse, circle, heart, sparkle } from '../game/art/draw';
import { prune } from '../sim/math';

const rand = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor() {
    this.list = [];
  }
  // shape: 'circle' | 'leaf' | 'heart' | 'star'
  burst(
    x,
    y,
    {
      n = 8,
      color = '#fff',
      colors = null,
      speed = 120,
      size = 4,
      life = 0.5,
      gravity = 300,
      shape = 'circle',
      spread = TAU,
      dir = 0,
    } = {},
  ) {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread,
        s = speed * rand(0.4, 1);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        size: size * rand(0.6, 1.3),
        color: colors ? colors[i % colors.length] : color,
        gravity,
        shape,
        rot: rand(0, TAU),
        vr: rand(-6, 6),
        dead: false,
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.shape === 'leaf') {
        p.vx *= 0.985;
        p.vy *= 0.985;
      }
    }
    prune(this.list);
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      if (p.shape === 'leaf') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ellipse(ctx, 0, 0, p.size * 1.6, p.size * 0.8);
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'heart') {
        heart(ctx, p.x, p.y, p.size * k);
        ctx.fill();
      } else if (p.shape === 'star') {
        sparkle(ctx, p.x, p.y, p.size * (0.5 + k));
        ctx.fill();
      } else {
        circle(ctx, p.x, p.y, p.size * k);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
