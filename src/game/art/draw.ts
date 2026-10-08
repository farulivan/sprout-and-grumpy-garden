// Canvas 2D path helpers and the shared cute face. Every character is built from these.
import { TAU } from '../../config';

type Ctx = CanvasRenderingContext2D;
export type FaceMood = 'happy' | 'neutral' | 'angry' | 'hurt' | 'surprised' | 'sleepy';

// ---- path helpers (they only build the path; call fill/stroke or fillStroke after) ----
export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}
export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function heart(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.3, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.closePath();
}
export function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}
// Fill + outline in one go: the "sticker" look every character uses.
export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, stroke: string | null, width = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

const INK = '#3b2a2a';
// Cute face. s = scale (1 is about Pip's size).
export function drawFace(ctx: Ctx, x: number, y: number, s: number, mood: FaceMood = 'happy', blink = false) {
  const dx = 11 * s,
    er = 4.2 * s,
    ey = y - 2 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of [-1, 1]) {
    const ex = x + d * dx;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4 * s;
    if (blink || mood === 'sleepy') {
      ctx.beginPath();
      ctx.moveTo(ex - er, ey);
      ctx.lineTo(ex + er, ey);
      ctx.stroke();
    } else if (mood === 'hurt') {
      // >  <
      ctx.beginPath();
      ctx.moveTo(ex + d * er, ey - er);
      ctx.lineTo(ex - d * er * 0.6, ey);
      ctx.lineTo(ex + d * er, ey + er);
      ctx.stroke();
    } else {
      const r = mood === 'surprised' ? er * 1.3 : er;
      ctx.fillStyle = INK;
      circle(ctx, ex, ey, r);
      ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, ex - r * 0.3, ey - r * 0.35, r * 0.38);
      ctx.fill();
    }
    if (mood === 'angry') {
      // brows in a V
      ctx.lineWidth = 2.8 * s;
      ctx.beginPath();
      ctx.moveTo(ex + d * er * 1.7, ey - er * 2.7);
      ctx.lineTo(ex - d * er * 1.1, ey - er * 1.8);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.38)';
  ellipse(ctx, x - dx * 1.4, y + 5 * s, 5 * s, 3 * s);
  ctx.fill();
  ellipse(ctx, x + dx * 1.4, y + 5 * s, 5 * s, 3 * s);
  ctx.fill();
  const my = y + 8 * s;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(x, my - 3 * s, 5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 'angry') ctx.arc(x, my + 6 * s, 5 * s, 1.2 * Math.PI, 1.8 * Math.PI);
  else if (mood === 'hurt') {
    ctx.moveTo(x - 4 * s, my + 2 * s);
    ctx.quadraticCurveTo(x, my - 3 * s, x + 4 * s, my + 2 * s);
  } else if (mood === 'surprised') {
    ctx.fillStyle = INK;
    ellipse(ctx, x, my + s, 3 * s, 4 * s);
    ctx.fill();
    return;
  } else if (mood === 'sleepy') {
    ctx.fillStyle = INK;
    ellipse(ctx, x, my + s, 2 * s, 2.5 * s);
    ctx.fill();
    return;
  } else {
    ctx.moveTo(x - 4 * s, my + s);
    ctx.lineTo(x + 4 * s, my + s);
  }
  ctx.stroke();
}
