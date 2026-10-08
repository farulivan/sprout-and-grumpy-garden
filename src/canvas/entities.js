// Temporary Canvas 2D drawing, moved from the original game's draw() methods. Phaser views replace it in M2.
// Each function draws one simulation object; none of them change it.
import { GROUND, TAU, W } from '../config';
import { circle, ellipse, roundRect, fillStroke, drawFace, heart, sparkle } from '../game/art/draw';
import { PETAL_COLOR } from '../presentation';
import { clamp, qbez } from '../sim/math';
import { VINE_WARN, ROOT_WARN, POLLEN_WARN, POLLEN_CLOUD } from '../sim/hazards';

// Pip. Feet are at (x, y); the sprite is drawn upward from there.
export function drawPlayer(ctx, p, blink) {
  const inAir = !p.onGround;
  const sh = clamp(1 - (GROUND - p.y) / 500, 0.4, 1);
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ellipse(ctx, p.x, GROUND + 3, 18 * sh, 5 * sh);
  ctx.fill();
  ctx.save();
  if (p.inv > 0 && p.alive && Math.floor(p.inv * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing * (1 + (1 - p.sq) * 0.8), p.sq);
  if (!p.alive) ctx.rotate(-0.35);
  const run = p.onGround && Math.abs(p.vx) > 30,
    bob = run ? Math.abs(Math.sin(p.runT)) * 3 : 0;
  const step = run ? Math.sin(p.runT) * 7 : 0;
  for (const [fx, ph] of [
    [-8, 1],
    [8, -1],
  ]) {
    ellipse(ctx, fx + step * ph, -3 - (run ? Math.max(0, Math.sin(p.runT) * ph) * 4 : 0), 8, 5);
    fillStroke(ctx, '#5aa64a', '#3f8a33', 2.5);
  }
  ctx.translate(0, -bob);
  ellipse(ctx, 0, -26, 21, 24);
  fillStroke(ctx, '#a5e37f', '#4f9d3d', 3.2);
  ellipse(ctx, -6, -32, 8, 11, 0.3);
  fillStroke(ctx, 'rgba(255,255,255,0.35)', null);
  const wig = Math.sin(p.t * 6) * 0.15 + (inAir ? 0.35 : 0);
  ctx.strokeStyle = '#4f9d3d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -49);
  ctx.quadraticCurveTo(1, -56, 0, -62);
  ctx.stroke();
  ellipse(ctx, -9, -62, 10, 5.5, -0.7 - wig);
  fillStroke(ctx, '#7ccf63', '#4f9d3d', 2.5);
  ellipse(ctx, 9, -62, 10, 5.5, 0.7 + wig);
  fillStroke(ctx, '#7ccf63', '#4f9d3d', 2.5);
  const mood = p.hurtT > 0 ? 'hurt' : !p.alive ? 'sleepy' : inAir ? 'surprised' : 'happy';
  drawFace(ctx, 3, -28, 0.95, mood, blink);
  const hx = 17 - p.recoil * 5; // hand + acorn-cap seed blaster
  circle(ctx, hx, -22, 6);
  fillStroke(ctx, '#a5e37f', '#4f9d3d', 2.5);
  roundRect(ctx, hx + 2, -28, 12, 11, 4);
  fillStroke(ctx, '#c58a5a', '#7a4e2c', 2.5);
  ctx.restore();
}

// Sunny.
export function drawBoss(ctx, b, blink) {
  const { x, y, t } = b;
  const cx = b.baseX + (x - b.baseX) * 0.3,
    cy = (GROUND + y) / 2 + 30;
  ctx.lineCap = 'round';
  for (const [col, w] of [
    ['#3f8a33', 26],
    ['#6cc551', 17],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(b.baseX, GROUND + 6);
    ctx.quadraticCurveTo(cx, cy, x, y + 30);
    ctx.stroke();
  }
  for (const [u, side] of [
    [0.35, -1],
    [0.6, 1],
  ]) {
    // two big stem leaves
    const px = qbez(b.baseX, cx, x, u),
      py = qbez(GROUND + 6, cy, y + 30, u);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(side * -0.9 + Math.sin(t * 1.6 + u * 5) * 0.12);
    ellipse(ctx, side * 34, 0, 36, 15);
    fillStroke(ctx, '#7ccf63', '#3f8a33', 3);
    ctx.strokeStyle = '#3f8a33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * 6, 0);
    ctx.lineTo(side * 62, 0);
    ctx.stroke();
    ctx.restore();
  }
  ellipse(ctx, b.baseX, GROUND + 4, 46, 12);
  fillStroke(ctx, '#b47a4c', '#7a4e2c', 3);

  ctx.save();
  ctx.translate(x, y);
  const sc = 1 + b.puff * 0.08 + (b.flash > 0 ? 0.05 : 0);
  ctx.scale(sc, sc);
  ctx.rotate(Math.sin(t * 1.3) * 0.05);
  const petal = b.alive ? PETAL_COLOR[b.phase - 1] : '#ffe066',
    n = 14;
  for (let i = 0; i < n; i++) {
    const len = 46 * (1 + b.puff * 0.2) + Math.sin(t * 3 + i) * 4 * b.happy;
    ctx.save();
    ctx.rotate((i / n) * TAU + Math.sin(t * 2 + i) * 0.02);
    ellipse(ctx, b.r + len * 0.55, 0, len * 0.6, 17);
    fillStroke(ctx, petal, '#d98f1a', 3);
    ctx.restore();
  }
  circle(ctx, 0, 0, b.r);
  fillStroke(ctx, '#8a5a2b', '#5a381a', 4);
  circle(ctx, 0, 0, b.r - 12);
  fillStroke(ctx, '#a06a36', null);
  ctx.fillStyle = 'rgba(90,56,26,0.55)';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    circle(ctx, Math.cos(a) * (b.r - 7), Math.sin(a) * (b.r - 7), 2.5);
    ctx.fill();
  }
  const sleepy = b.state === 'sleep' || (b.state === 'intro' && b.introT < 0.9);
  const mood = b.flash > 0 ? 'hurt' : sleepy ? 'sleepy' : !b.alive ? 'happy' : b.mood;
  drawFace(ctx, 0, 4, 2.3, mood, blink);
  if (b.flash > 0) {
    ctx.globalAlpha = (b.flash / 0.12) * 0.6;
    ctx.fillStyle = '#fff';
    circle(ctx, 0, 0, b.r + 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (b.telegraph > 0) {
    // "!" bubble = an attack is coming
    const bx = x - 75,
      by = y - 100 - Math.abs(Math.sin(t * 10)) * 6;
    roundRect(ctx, bx - 22, by - 24, 44, 48, 14);
    fillStroke(ctx, '#fff', '#ffb52e', 3);
    ctx.fillStyle = '#ff7f50';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.fillText('!', bx, by + 2);
  }
  if (sleepy) {
    ctx.fillStyle = '#6b8fb5';
    ctx.font = 'bold 26px Fredoka, sans-serif';
    ctx.fillText('z', x + 75, y - 70 - (t % 1) * 20);
  }
  ctx.textBaseline = 'alphabetic';
}

export function drawProjectile(ctx, pr) {
  pr._spin ??= Math.random() * TAU; // looks only, so it lives here and not in the simulation
  ctx.save();
  ctx.translate(pr.x, pr.y);
  if (pr.kind === 'sprout') {
    // player's seed: green drop with a leaf tail
    ctx.rotate(Math.atan2(pr.vy, pr.vx));
    ellipse(ctx, -7, 0, 6, 3);
    fillStroke(ctx, '#b6ea7f', null);
    circle(ctx, 0, 0, pr.r);
    fillStroke(ctx, '#8fdc5b', '#4f9d3d', 2.5);
    ctx.fillStyle = '#fff';
    circle(ctx, -2, -2.5, 2);
    ctx.fill();
  } else if (pr.kind === 'bossSeed') {
    // striped sunflower seed
    ctx.rotate(pr._spin + pr.t * 6);
    ellipse(ctx, 0, 0, pr.r * 0.75, pr.r);
    fillStroke(ctx, '#6b4a2e', '#3f2a18', 2.5);
    ctx.strokeStyle = '#e9d8b5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -pr.r + 3);
    ctx.lineTo(0, pr.r - 3);
    ctx.stroke();
  } else {
    // spinning yellow petal
    ctx.rotate(pr._spin + pr.t * 5);
    ellipse(ctx, 0, 0, pr.r * 1.3, pr.r * 0.65);
    fillStroke(ctx, '#ffd23f', '#d98f1a', 2.5);
  }
  ctx.restore();
}

function drawPollen(ctx, x, y, r, t) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + t * 3;
    circle(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.6);
    fillStroke(ctx, '#ffe066', null);
  }
  circle(ctx, x, y, r * 0.7);
  fillStroke(ctx, '#fff1a8', null);
}

export function drawDewdrop(ctx, d) {
  if (d.life < 3 && Math.floor(d.life * 8) % 2 === 0) return; // blink before vanishing
  const x = d.x,
    y = d.y + Math.sin(d.t * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.bezierCurveTo(x + 16, y - 2, x + 12, y + 12, x, y + 12);
  ctx.bezierCurveTo(x - 12, y + 12, x - 16, y - 2, x, y - 20);
  ctx.closePath();
  fillStroke(ctx, '#8fd8ff', '#3f9ad6', 2.5);
  ctx.fillStyle = '#fff';
  ellipse(ctx, x - 4, y, 2.5, 5, 0.3);
  ctx.fill();
  heart(ctx, x + 1, y + 2, 4);
  ctx.fillStyle = '#ff7fa0';
  ctx.fill();
  ctx.fillStyle = '#fff';
  sparkle(ctx, x + 12, y - 16, 5 + Math.sin(d.t * 6) * 2);
  ctx.fill();
}

export function drawHazard(ctx, h) {
  if (h.kind === 'vine') drawVine(ctx, h);
  else if (h.kind === 'root') drawRoot(ctx, h);
  else drawPollenDrop(ctx, h);
}

function drawVine(ctx, v) {
  if (v.warn > 0) {
    // rumbling dirt mound at the right edge
    const k = 1 - v.warn / VINE_WARN,
      jx = (Math.random() - 0.5) * 3;
    ellipse(ctx, W - 40 + jx, GROUND + 2, 44, 10 + 12 * k);
    fillStroke(ctx, '#b47a4c', '#7a4e2c', 3);
    ctx.fillStyle = '#7a4e2c';
    for (let i = 0; i < 4; i++) {
      circle(ctx, W - 60 + i * 14 + jx, GROUND - 6 - Math.abs(Math.sin(v.t * 20 + i)) * 12 * k, 3);
      ctx.fill();
    }
    return;
  }
  const y = v.y + v.h / 2,
    x0 = v.x,
    x1 = v.x + v.w;
  ctx.lineCap = 'round';
  for (const [col, w] of [
    ['#3f8a33', v.h - 4],
    ['#6cc551', v.h - 12],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1 + 60, y + 4);
    for (let x = x1 + 60; x >= x0; x -= 12) ctx.lineTo(x, y + Math.sin(x * 0.07 + v.t * 10) * 4);
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, x0 + 30 + i * 45, y - 20, 14, 7, -0.6);
    fillStroke(ctx, '#7ccf63', '#3f8a33', 2.5);
  }
  circle(ctx, x0 - 6, y - 4, 16);
  fillStroke(ctx, '#6cc551', '#3f8a33', 3);
  drawFace(ctx, x0 - 6, y - 4, 0.7, 'angry');
}

function drawRoot(ctx, r) {
  const x = r.x;
  if (r.phase === 'warn') {
    const k = 1 - r.warn / ROOT_WARN,
      j = (Math.random() - 0.5) * 4 * k;
    ellipse(ctx, x + j, GROUND + 2, 26 * (0.5 + 0.5 * Math.abs(Math.sin(r.t * 10))), 7);
    fillStroke(ctx, '#b47a4c', '#7a4e2c', 2);
    ctx.fillStyle = '#ff7f50';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('!', x, GROUND - 16 - Math.abs(Math.sin(r.t * 8)) * 6);
    return;
  }
  const h = r.h * r.up;
  ctx.beginPath();
  ctx.moveTo(x - r.w / 2, GROUND + 4);
  ctx.quadraticCurveTo(x - r.w * 0.35, GROUND - h * 0.6, x, GROUND - h);
  ctx.quadraticCurveTo(x + r.w * 0.35, GROUND - h * 0.6, x + r.w / 2, GROUND + 4);
  ctx.closePath();
  fillStroke(ctx, '#a9764b', '#6d4a2b', 3);
  ctx.strokeStyle = 'rgba(109,74,43,0.5)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const yy = GROUND - (h * i) / 4,
      ww = r.w * (0.5 - i * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - ww, yy);
    ctx.lineTo(x + ww, yy);
    ctx.stroke();
  }
  ellipse(ctx, x + 8, GROUND - h - 6, 9, 5, -0.5);
  fillStroke(ctx, '#7ccf63', '#3f8a33', 2);
  ellipse(ctx, x, GROUND + 2, 30, 8);
  fillStroke(ctx, '#b47a4c', '#7a4e2c', 2);
}

function drawPollenDrop(ctx, d) {
  const x = d.x;
  if (d.phase === 'warn') {
    if (d.warn > POLLEN_WARN) return;
    const k = clamp(1 - d.warn / POLLEN_WARN, 0, 1);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(d.t * 12) ** 2;
    ellipse(ctx, x, GROUND + 1, 28, 9);
    fillStroke(ctx, '#ffe066', '#e0a800', 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(224,168,0,0.35)';
    circle(ctx, x, GROUND - 8, 4 + 10 * k);
    ctx.fill();
    return;
  }
  if (d.phase === 'fall') {
    ctx.fillStyle = 'rgba(224,168,0,0.3)';
    ellipse(ctx, x, GROUND + 1, 20, 6);
    ctx.fill();
    drawPollen(ctx, x, d.y, d.r, d.t);
    return;
  }
  const k = d.cloud / POLLEN_CLOUD;
  ctx.globalAlpha = k * 0.8;
  for (let i = 0; i < 4; i++) {
    circle(
      ctx,
      x + Math.cos(i * 1.57) * 18 * (1.4 - k),
      GROUND - 14 - Math.abs(Math.sin(i * 1.57)) * 8 * (1.4 - k),
      16 * (0.6 + 0.4 * k),
    );
    fillStroke(ctx, '#ffe066', null);
  }
  ctx.globalAlpha = 1;
}
