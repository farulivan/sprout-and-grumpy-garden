// A stage's ground, as its small enemies see it.
import type { Rect } from '../math';

interface Ground {
  readonly solids: readonly Rect[];
  readonly platforms: readonly Rect[];
}

// Is there something to stand on at (x, y): the top of a solid box or a leaf pad, at that height?
export function supportAt(g: Ground, x: number, y: number) {
  const under = (r: Rect) => x >= r.x && x <= r.x + r.w && Math.abs(r.y - y) < 1;
  return g.solids.some(under) || g.platforms.some(under);
}

// Is (x, y) inside a solid box?
export function solidAt(solids: readonly Rect[], x: number, y: number) {
  return solids.some((s) => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h);
}
