// Canvas 2D helpers: paths, gradients, and the shading tricks that give the code-drawn shapes some volume.
// The light in this game always comes from the top left (where the sun hangs), so highlights sit on the
// upper left of things and shadows on the lower right.
import { TAU } from '../../config';
import { Rng } from '../../sim/rng';
import { rgba } from './color';

export type Ctx = CanvasRenderingContext2D;
export type Paint = string | CanvasGradient;
// Gradient stops: colours spread evenly, or [position, colour] pairs.
export type Stops = readonly (string | readonly [number, string])[];
export type Pt = readonly [number, number];

// A repeatable stream of random numbers (0..1) for scattering details: the art comes out the same every time.
export function seeded(seed: number): () => number {
  const rng = new Rng(seed);
  return () => rng.next();
}

// ---- path helpers (they only build the path; fill or stroke it afterwards) ----
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
// Four-pointed twinkle.
export function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}
// A leaf (or petal) growing from (x, y) for len pixels in direction rot. wid is its half-width, belly is
// how far along its widest part sits (0.5 = middle), and tip < 1 rounds the point off.
export function leaf(
  ctx: Ctx,
  x: number,
  y: number,
  len: number,
  wid: number,
  rot = 0,
  belly = 0.45,
  tip = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const b = len * belly,
    t = len * (0.55 + 0.45 * tip);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(b * 0.4, -wid * 1.25, t, -wid * (1.6 - tip), len, 0);
  ctx.bezierCurveTo(t, wid * (1.6 - tip), b * 0.4, wid * 1.25, 0, 0);
  ctx.closePath();
  ctx.restore();
}
// A closed, smooth shape through the given points (they act as control points, so it stays inside them).
export function smooth(ctx: Ctx, pts: readonly Pt[]) {
  const n = pts.length,
    mid = (i: number): Pt => {
      const a = pts[i % n],
        b = pts[(i + 1) % n];
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    };
  ctx.beginPath();
  ctx.moveTo(...mid(n - 1));
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], ...mid(i));
  ctx.closePath();
}
// A lumpy circle. rand() returns 0..1; amp is how lumpy (0 = a circle).
export function blob(ctx: Ctx, x: number, y: number, r: number, rand: () => number, bumps = 9, amp = 0.16) {
  const pts: Pt[] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * TAU,
      d = r * (1.08 + (rand() - 0.5) * 2 * amp);
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  smooth(ctx, pts);
}
// A blade of grass from (x, y) up to height h, leaning by lean pixels at the tip.
export function blade(ctx: Ctx, x: number, y: number, h: number, w: number, lean: number) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w / 2 + lean * 0.3, y - h * 0.6, x + lean, y - h);
  ctx.quadraticCurveTo(x + w / 2 + lean * 0.5, y - h * 0.5, x + w / 2, y);
  ctx.closePath();
}

// ---- paint helpers ----
function addStops(g: CanvasGradient, stops: Stops) {
  stops.forEach((s, i) =>
    typeof s === 'string'
      ? g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, s)
      : g.addColorStop(s[0], s[1]),
  );
  return g;
}
export function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  return addStops(ctx.createLinearGradient(x0, y0, x1, y1), stops);
}
// (fx, fy) is where the brightest point sits; it defaults to the centre.
export function radial(ctx: Ctx, x: number, y: number, r: number, stops: Stops, fx = x, fy = y) {
  return addStops(ctx.createRadialGradient(fx, fy, 0, x, y, r), stops);
}

// Run paint() so that it only shows inside the shape build() makes.
export function inside(ctx: Ctx, build: () => void, paint: () => void) {
  ctx.save();
  build();
  ctx.clip();
  paint();
  ctx.restore();
}
// A soft round patch of colour that fades to nothing at the edge: glows, highlights, contact shadows.
export function glow(ctx: Ctx, x: number, y: number, rx: number, color: string, alpha = 1, ry = rx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, [
    [0, rgba(color, alpha)],
    [0.5, rgba(color, alpha * 0.45)],
    [1, rgba(color, 0)],
  ]);
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

export interface Volume {
  fill: Paint;
  stroke?: string | null;
  width?: number;
  light?: number; // strength of the highlight on the upper left, 0-1
  dark?: number; // strength of the shadow on the lower right, 0-1
  shade?: string; // shadow colour
}
// Fill a roundish shape and model it like a ball lit from the top left: a soft highlight, a shadow that
// hugs the lower right edge, then the outline. (cx, cy, rx, ry) is roughly the shape's middle and size.
export function volume(
  ctx: Ctx,
  build: () => void,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  v: Volume,
) {
  const { light = 0.4, dark = 0.3, shade = '#2a1608' } = v;
  build();
  ctx.fillStyle = v.fill;
  ctx.fill();
  inside(ctx, build, () => {
    const r = Math.max(rx, ry);
    if (dark > 0) {
      ctx.fillStyle = radial(ctx, cx - rx * 0.45, cy - ry * 0.5, r * 1.75, [
        [0, rgba(shade, 0)],
        [0.55, rgba(shade, 0)],
        [0.8, rgba(shade, dark * 0.55)],
        [1, rgba(shade, dark)],
      ]);
      ctx.fillRect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4);
    }
    if (light > 0) glow(ctx, cx - rx * 0.38, cy - ry * 0.45, rx * 0.95, '#ffffff', light, ry * 0.8);
  });
  if (v.stroke) {
    build();
    ctx.lineWidth = v.width ?? 3;
    ctx.strokeStyle = v.stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// Stroke the current path. For veins, creases and other line work.
export function line(ctx: Ctx, color: string, width: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
