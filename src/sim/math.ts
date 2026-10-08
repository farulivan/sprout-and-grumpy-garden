// Math and hit tests used by the simulation.
export interface Circle {
  x: number;
  y: number;
  r: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
export const circleHit = (a: Circle, b: Circle) => dist(a.x, a.y, b.x, b.y) < a.r + b.r;
export function rectCircleHit(r: Rect, c: Circle) {
  const cx = clamp(c.x, r.x, r.x + r.w);
  const cy = clamp(c.y, r.y, r.y + r.h);
  return dist(cx, cy, c.x, c.y) < c.r;
}
// Remove dead entities in place (the arrays are shared by reference).
export function prune(arr: { dead: boolean }[]) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i].dead) arr.splice(i, 1);
}
// Point on a quadratic bezier.
export const qbez = (a: number, b: number, c: number, u: number) =>
  (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
