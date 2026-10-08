// Arena: parallax garden background, ground, and one-way leaf platforms.
import { W, H, GROUND, circle, ellipse, fillStroke, drawFace, roundRect } from './utils.js';

export const platforms = [{ x: 300, y: 352, w: 150, h: 22 }, { x: 560, y: 292, w: 140, h: 22 }];

const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 190 + 40, y: 50 + (i % 3) * 38, s: 0.7 + (i % 3) * 0.25, v: 12 + (i % 2) * 8 }));
const flowers = Array.from({ length: 22 }, (_, i) => ({ x: 20 + i * 44 + ((i * 37) % 23), c: ['#ff8fb1', '#ffd66b', '#b48cff', '#ff9f68', '#8fd8ff'][i % 5], h: 10 + (i * 13) % 12 }));
const trees = [[80, 1], [220, 0.8], [880, 0.9], [640, 0.7], [420, 0.75]];

export function drawBackground(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#eaf8ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(130, 90, 20, 130, 90, 110); glow.addColorStop(0, 'rgba(255,240,170,0.9)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 300, 250);
  circle(ctx, 130, 90, 42); fillStroke(ctx, '#ffe985', '#f5c542', 4);
  drawFace(ctx, 130, 92, 1.3, 'happy', Math.sin(t * 0.8) > 0.97);
  for (const c of clouds) drawCloud(ctx, ((c.x + t * c.v) % (W + 260)) - 130, c.y, c.s);
  ctx.fillStyle = '#bfe8a6'; ctx.beginPath(); ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GROUND - 70 - Math.sin(x * 0.006 + 1) * 40 - Math.sin(x * 0.02) * 12);
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a2dc8a'; ctx.beginPath(); ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GROUND - 30 - Math.sin(x * 0.009 + 3) * 28 - Math.cos(x * 0.03) * 6);
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
  for (const [x, s] of trees) drawTree(ctx, x, GROUND - 10, s, t);
}
function drawCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [dx, dy, r] of [[0, 0, 26], [24, -10, 30], [52, 0, 24], [26, 10, 26]]) { circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
}
function drawTree(ctx, x, y, s, t) {
  ctx.fillStyle = '#8b5a3c'; roundRect(ctx, x - 7 * s, y - 60 * s, 14 * s, 60 * s, 6 * s); ctx.fill();
  const sway = Math.sin(t * 1.2 + x) * 3 * s;
  for (const [dx, dy, r, c] of [[-18, -70, 26, '#7ccf63'], [18, -74, 26, '#8fd870'], [0, -92, 28, '#9be07a']]) {
    circle(ctx, x + dx * s + sway, y + dy * s, r * s); fillStroke(ctx, c, '#4d9a3f', 3);
  }
}
export function drawGround(ctx) {
  ctx.fillStyle = '#c58a5a'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#a86f43'; for (let i = 0; i < 12; i++) { ellipse(ctx, 40 + i * 84, GROUND + 40 + (i % 3) * 10, 10, 5); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, GROUND + 16);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, GROUND - 6 + Math.sin(x * 0.3) * 4);
  ctx.lineTo(W, GROUND + 16); ctx.closePath(); fillStroke(ctx, '#6fc95a', '#4d9a3f', 3);
  for (const f of flowers) {
    ctx.strokeStyle = '#4d9a3f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, GROUND - 2); ctx.lineTo(f.x, GROUND - f.h); ctx.stroke();
    circle(ctx, f.x, GROUND - f.h - 3, 4.5); fillStroke(ctx, f.c, null);
    circle(ctx, f.x, GROUND - f.h - 3, 1.8); fillStroke(ctx, '#fff7d6', null);
  }
}
export function drawPlatforms(ctx, t) {
  for (const p of platforms) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2 + Math.sin(t * 1.5 + p.x) * 2;
    ellipse(ctx, cx, cy, p.w / 2 + 6, p.h / 2 + 6); fillStroke(ctx, '#7ccf63', '#4d9a3f', 3.5);
    ctx.strokeStyle = '#4d9a3f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x + 6, cy); ctx.lineTo(p.x + p.w - 6, cy); ctx.stroke();
    for (let i = 1; i < 5; i++) { const x = p.x + p.w * i / 5; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 12, cy - 8); ctx.moveTo(x, cy); ctx.lineTo(x + 12, cy + 8); ctx.stroke(); }
  }
}
