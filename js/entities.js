// Projectiles, particles, pickups and boss hazards.
// Every entity exposes update(dt), draw(ctx) and a `dead` flag. Hazards also expose hits(circle).
import { W, H, GROUND, TAU, circle, ellipse, fillStroke, rectCircleHit, circleHit, rand, clamp, heart, sparkle, prune, drawFace } from './utils.js';

export class Projectile {
  // kind: 'sprout' (player) | 'bossSeed' | 'petal' | 'pollen'
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, r: 6, gravity: 0, owner: 'boss', kind: 'seed', life: 6, t: 0, dead: false, spin: rand(TAU) }, o);
  }
  update(dt) {
    this.t += dt; this.life -= dt; this.vy += this.gravity * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || this.x < -40 || this.x > W + 40 || this.y > H + 40 || this.y < -160) this.dead = true;
    if (this.gravity && this.y + this.r >= GROUND) { this.dead = true; this.hitGround = true; }
  }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.kind === 'sprout') {            // player's seed: green drop with a leaf tail
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ellipse(ctx, -7, 0, 6, 3); fillStroke(ctx, '#b6ea7f', null);
      circle(ctx, 0, 0, this.r); fillStroke(ctx, '#8fdc5b', '#4f9d3d', 2.5);
      ctx.fillStyle = '#fff'; circle(ctx, -2, -2.5, 2); ctx.fill();
    } else if (this.kind === 'bossSeed') {   // striped sunflower seed
      ctx.rotate(this.spin + this.t * 6);
      ellipse(ctx, 0, 0, this.r * 0.75, this.r); fillStroke(ctx, '#6b4a2e', '#3f2a18', 2.5);
      ctx.strokeStyle = '#e9d8b5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -this.r + 3); ctx.lineTo(0, this.r - 3); ctx.stroke();
    } else if (this.kind === 'petal') {      // spinning yellow petal
      ctx.rotate(this.spin + this.t * 5);
      ellipse(ctx, 0, 0, this.r * 1.3, this.r * 0.65); fillStroke(ctx, '#ffd23f', '#d98f1a', 2.5);
    } else {                                 // fuzzy pollen ball
      drawPollen(ctx, 0, 0, this.r, this.t);
    }
    ctx.restore();
  }
}

function drawPollen(ctx, x, y, r, t) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 3; circle(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.6); fillStroke(ctx, '#ffe066', null); }
  circle(ctx, x, y, r * 0.7); fillStroke(ctx, '#fff1a8', null);
}

export class Particles {
  constructor() { this.list = []; }
  // shape: 'circle' | 'leaf' | 'heart' | 'star'
  burst(x, y, { n = 8, color = '#fff', colors = null, speed = 120, size = 4, life = 0.5, gravity = 300, shape = 'circle', spread = TAU, dir = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread, s = speed * rand(0.4, 1);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: size * rand(0.6, 1.3),
        color: colors ? colors[i % colors.length] : color, gravity, shape, rot: rand(TAU), vr: rand(-6, 6), dead: false });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt; if (p.life <= 0) { p.dead = true; continue; }
      p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.shape === 'leaf') { p.vx *= 0.985; p.vy *= 0.985; }
    }
    prune(this.list);
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.color;
      if (p.shape === 'leaf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ellipse(ctx, 0, 0, p.size * 1.6, p.size * 0.8); ctx.fill(); ctx.restore(); }
      else if (p.shape === 'heart') { heart(ctx, p.x, p.y, p.size * k); ctx.fill(); }
      else if (p.shape === 'star') { sparkle(ctx, p.x, p.y, p.size * (0.5 + k)); ctx.fill(); }
      else { circle(ctx, p.x, p.y, p.size * k); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}

// Heals one heart. Dropped from the sky at each boss phase change.
export class Dewdrop {
  constructor(x, y) { this.x = x; this.y = y; this.vy = 0; this.r = 14; this.t = 0; this.life = 10; this.dead = false; }
  update(dt) {
    this.t += dt; this.life -= dt; if (this.life <= 0) this.dead = true;
    this.vy += 500 * dt; this.y += this.vy * dt;
    if (this.y > GROUND - 14) { this.y = GROUND - 14; this.vy = 0; }
  }
  draw(ctx) {
    if (this.life < 3 && Math.floor(this.life * 8) % 2 === 0) return; // blink before vanishing
    const x = this.x, y = this.y + Math.sin(this.t * 4) * 3;
    ctx.beginPath(); ctx.moveTo(x, y - 20);
    ctx.bezierCurveTo(x + 16, y - 2, x + 12, y + 12, x, y + 12);
    ctx.bezierCurveTo(x - 12, y + 12, x - 16, y - 2, x, y - 20); ctx.closePath();
    fillStroke(ctx, '#8fd8ff', '#3f9ad6', 2.5);
    ctx.fillStyle = '#fff'; ellipse(ctx, x - 4, y, 2.5, 5, 0.3); ctx.fill();
    heart(ctx, x + 1, y + 2, 4); ctx.fillStyle = '#ff7fa0'; ctx.fill();
    ctx.fillStyle = '#fff'; sparkle(ctx, x + 12, y - 16, 5 + Math.sin(this.t * 6) * 2); ctx.fill();
  }
}

// ---------------- Boss hazards ----------------

// A vine slides along the ground from the right edge. Jump over it (or stand on a leaf platform).
export class VineSweep {
  constructor(speed = 380) { this.x = W + 40; this.speed = speed; this.w = 150; this.h = 34; this.t = 0; this.warn = 0.7; this.dead = false; }
  get y() { return GROUND - this.h; }
  update(dt) {
    this.t += dt;
    if (this.warn > 0) { this.warn -= dt; return; }
    this.x -= this.speed * dt;
    if (this.x + this.w + 80 < 0) this.dead = true;
  }
  hits(c) { return this.warn <= 0 && rectCircleHit({ x: this.x + 8, y: this.y + 6, w: this.w - 16, h: this.h - 6 }, c); }
  draw(ctx) {
    if (this.warn > 0) { // rumbling dirt mound at the right edge
      const k = 1 - this.warn / 0.7, jx = (Math.random() - 0.5) * 3;
      ellipse(ctx, W - 40 + jx, GROUND + 2, 44, 10 + 12 * k); fillStroke(ctx, '#b47a4c', '#7a4e2c', 3);
      ctx.fillStyle = '#7a4e2c';
      for (let i = 0; i < 4; i++) { circle(ctx, W - 60 + i * 14 + jx, GROUND - 6 - Math.abs(Math.sin(this.t * 20 + i)) * 12 * k, 3); ctx.fill(); }
      return;
    }
    const y = this.y + this.h / 2, x0 = this.x, x1 = this.x + this.w;
    ctx.lineCap = 'round';
    for (const [col, w] of [['#3f8a33', this.h - 4], ['#6cc551', this.h - 12]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1 + 60, y + 4);
      for (let x = x1 + 60; x >= x0; x -= 12) ctx.lineTo(x, y + Math.sin(x * 0.07 + this.t * 10) * 4);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) { ellipse(ctx, x0 + 30 + i * 45, y - 20, 14, 7, -0.6); fillStroke(ctx, '#7ccf63', '#3f8a33', 2.5); }
    circle(ctx, x0 - 6, y - 4, 16); fillStroke(ctx, '#6cc551', '#3f8a33', 3);
    drawFace(ctx, x0 - 6, y - 4, 0.7, 'angry');
  }
}

// A root pops out of the ground at a marked spot. Step away from the "!" mark.
export class RootSpike {
  constructor(x) { this.x = x; this.w = 46; this.h = 96; this.t = 0; this.warn = 0.75; this.up = 0; this.hold = 0.45; this.phase = 'warn'; this.dead = false; }
  update(dt) {
    this.t += dt;
    if (this.phase === 'warn') { this.warn -= dt; if (this.warn <= 0) this.phase = 'up'; }
    else if (this.phase === 'up') { this.up = Math.min(1, this.up + dt * 8); if (this.up >= 1) this.phase = 'hold'; }
    else if (this.phase === 'hold') { this.hold -= dt; if (this.hold <= 0) this.phase = 'down'; }
    else { this.up -= dt * 3; if (this.up <= 0) this.dead = true; }
  }
  hits(c) {
    if (this.phase === 'warn' || this.up < 0.3) return false;
    const h = this.h * this.up;
    return rectCircleHit({ x: this.x - this.w / 2 + 8, y: GROUND - h, w: this.w - 16, h }, c);
  }
  draw(ctx) {
    const x = this.x;
    if (this.phase === 'warn') {
      const k = 1 - this.warn / 0.75, j = (Math.random() - 0.5) * 4 * k;
      ellipse(ctx, x + j, GROUND + 2, 26 * (0.5 + 0.5 * Math.abs(Math.sin(this.t * 10))), 7); fillStroke(ctx, '#b47a4c', '#7a4e2c', 2);
      ctx.fillStyle = '#ff7f50'; ctx.font = 'bold 24px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('!', x, GROUND - 16 - Math.abs(Math.sin(this.t * 8)) * 6);
      return;
    }
    const h = this.h * this.up;
    ctx.beginPath(); ctx.moveTo(x - this.w / 2, GROUND + 4);
    ctx.quadraticCurveTo(x - this.w * 0.35, GROUND - h * 0.6, x, GROUND - h);
    ctx.quadraticCurveTo(x + this.w * 0.35, GROUND - h * 0.6, x + this.w / 2, GROUND + 4); ctx.closePath();
    fillStroke(ctx, '#a9764b', '#6d4a2b', 3);
    ctx.strokeStyle = 'rgba(109,74,43,0.5)'; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) { const yy = GROUND - h * i / 4, ww = this.w * (0.5 - i * 0.1); ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x + ww, yy); ctx.stroke(); }
    ellipse(ctx, x + 8, GROUND - h - 6, 9, 5, -0.5); fillStroke(ctx, '#7ccf63', '#3f8a33', 2);
    ellipse(ctx, x, GROUND + 2, 30, 8); fillStroke(ctx, '#b47a4c', '#7a4e2c', 2);
  }
}

// Pollen falls from the sky onto a marked spot, then leaves a short-lived cloud.
export class PollenDrop {
  constructor(x, delay = 0) { this.x = x; this.y = -30; this.r = 14; this.warn = 0.9 + delay; this.cloud = 0.5; this.phase = 'warn'; this.t = 0; this.dead = false; }
  update(dt) {
    this.t += dt;
    if (this.phase === 'warn') { this.warn -= dt; if (this.warn <= 0) this.phase = 'fall'; }
    else if (this.phase === 'fall') { this.y += 520 * dt; if (this.y + this.r >= GROUND) { this.y = GROUND - this.r; this.phase = 'cloud'; } }
    else { this.cloud -= dt; if (this.cloud <= 0) this.dead = true; }
  }
  hits(c) {
    if (this.phase === 'fall') return circleHit({ x: this.x, y: this.y, r: this.r - 2 }, c);
    if (this.phase === 'cloud') return circleHit({ x: this.x, y: GROUND - 14, r: 22 }, c);
    return false;
  }
  draw(ctx) {
    const x = this.x;
    if (this.phase === 'warn') {
      if (this.warn > 0.9) return;
      const k = clamp(1 - this.warn / 0.9, 0, 1);
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 12) ** 2;
      ellipse(ctx, x, GROUND + 1, 28, 9); fillStroke(ctx, '#ffe066', '#e0a800', 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(224,168,0,0.35)'; circle(ctx, x, GROUND - 8, 4 + 10 * k); ctx.fill();
      return;
    }
    if (this.phase === 'fall') {
      ctx.fillStyle = 'rgba(224,168,0,0.3)'; ellipse(ctx, x, GROUND + 1, 20, 6); ctx.fill();
      drawPollen(ctx, x, this.y, this.r, this.t);
      return;
    }
    const k = this.cloud / 0.5;
    ctx.globalAlpha = k * 0.8;
    for (let i = 0; i < 4; i++) { circle(ctx, x + Math.cos(i * 1.57) * 18 * (1.4 - k), GROUND - 14 - Math.abs(Math.sin(i * 1.57)) * 8 * (1.4 - k), 16 * (0.6 + 0.4 * k)); fillStroke(ctx, '#ffe066', null); }
    ctx.globalAlpha = 1;
  }
}
