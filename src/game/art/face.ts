// The small cute face shared by Pip, the sun and the little critters: two glossy eyes, blush and a mouth.
// (Sunny is big enough to get a face of his own, in SunnyView.)
import { circle, ellipse, type Ctx } from './draw';

export type FaceMood = 'happy' | 'joy' | 'neutral' | 'worried' | 'angry' | 'hurt' | 'surprised' | 'sleepy';

export const INK = '#2b1b17';

// s = scale (1 is about Pip's size). Fits in a box 46s wide and 31s tall around (x, y).
export function drawFace(ctx: Ctx, x: number, y: number, s: number, mood: FaceMood = 'happy', blink = false) {
  const dx = 10.5 * s,
    rx = 4.3 * s,
    ry = 5 * s,
    ey = y - 2 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of [-1, 1]) {
    const ex = x + d * dx;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5 * s;
    if (mood === 'hurt') {
      // >  <
      ctx.beginPath();
      ctx.moveTo(ex + d * rx, ey - ry * 0.85);
      ctx.lineTo(ex - d * rx * 0.6, ey);
      ctx.lineTo(ex + d * rx, ey + ry * 0.85);
      ctx.stroke();
    } else if (mood === 'joy') {
      // ^  ^
      ctx.beginPath();
      ctx.arc(ex, ey + ry * 0.55, rx * 1.05, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else if (blink || mood === 'sleepy') {
      ctx.beginPath();
      ctx.arc(ex, ey - ry * 0.45, rx * 1.05, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
    } else {
      const k = mood === 'surprised' ? 1.22 : 1;
      ctx.fillStyle = INK;
      ellipse(ctx, ex, ey, rx * k, ry * k);
      ctx.fill();
      ctx.fillStyle = '#fff';
      circle(ctx, ex - rx * 0.28, ey - ry * 0.36, rx * 0.44 * k);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      circle(ctx, ex + rx * 0.36, ey + ry * 0.38, rx * 0.2 * k);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (mood === 'angry' || mood === 'worried') {
      // angry brows slope down to the middle, worried ones slope up to it
      const tilt = mood === 'angry' ? 1 : -1;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(ex + d * rx * 1.6, ey - ry * (1.75 + 0.45 * tilt));
      ctx.lineTo(ex - d * rx * 1.1, ey - ry * (1.75 - 0.45 * tilt));
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,105,135,0.42)';
  for (const d of [-1, 1]) {
    ellipse(ctx, x + d * dx * 1.48, y + 5.5 * s, 5 * s, 3 * s);
    ctx.fill();
  }

  const my = y + 8 * s;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(x, my - 3.6 * s, 5.4 * s, 0.14 * Math.PI, 0.86 * Math.PI);
  } else if (mood === 'joy') {
    // wide open smile with a tongue
    ctx.moveTo(x - 6 * s, my - 1.6 * s);
    ctx.quadraticCurveTo(x, my - 0.4 * s, x + 6 * s, my - 1.6 * s);
    ctx.quadraticCurveTo(x + 5 * s, my + 6.5 * s, x, my + 6.2 * s);
    ctx.quadraticCurveTo(x - 5 * s, my + 6.5 * s, x - 6 * s, my - 1.6 * s);
    ctx.closePath();
    ctx.fillStyle = '#8c2f3a';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ff8fa3';
    ellipse(ctx, x, my + 6.2 * s, 4 * s, 3 * s);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, my - 1.6 * s);
    ctx.quadraticCurveTo(x, my - 0.4 * s, x + 6 * s, my - 1.6 * s);
    ctx.quadraticCurveTo(x + 5 * s, my + 6.5 * s, x, my + 6.2 * s);
    ctx.quadraticCurveTo(x - 5 * s, my + 6.5 * s, x - 6 * s, my - 1.6 * s);
    ctx.closePath();
  } else if (mood === 'angry') {
    ctx.arc(x, my + 6 * s, 5.2 * s, 1.2 * Math.PI, 1.8 * Math.PI);
  } else if (mood === 'hurt') {
    ctx.moveTo(x - 4 * s, my + 2 * s);
    ctx.quadraticCurveTo(x, my - 3 * s, x + 4 * s, my + 2 * s);
  } else if (mood === 'worried') {
    ctx.moveTo(x - 4.5 * s, my + 1.5 * s);
    ctx.quadraticCurveTo(x - 2 * s, my - 1.5 * s, x, my + 1 * s);
    ctx.quadraticCurveTo(x + 2 * s, my + 3 * s, x + 4.5 * s, my + 0.5 * s);
  } else if (mood === 'surprised' || mood === 'sleepy') {
    const k = mood === 'surprised' ? 1 : 0.68;
    ctx.fillStyle = INK;
    ellipse(ctx, x, my + s, 3 * s * k, 4 * s * k);
    ctx.fill();
    return;
  } else {
    ctx.moveTo(x - 4 * s, my + s);
    ctx.lineTo(x + 4 * s, my + s);
  }
  ctx.stroke();
}
