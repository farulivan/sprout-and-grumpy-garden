import type { Rect } from './math';

// One-way leaf platforms: Pip lands on them from above and can jump up through them.
export const platforms: readonly Rect[] = [
  { x: 300, y: 352, w: 150, h: 22 },
  { x: 560, y: 292, w: 140, h: 22 },
];
