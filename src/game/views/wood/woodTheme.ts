// The Mushroom Wood as a StageWorldView draws it. Its parts are baked in ./art.ts.
import { H } from '../../../config';
import type { StageTheme } from '../stage/StageWorldView';
import {
  BRUSH_P,
  CANOPY_P,
  FOREST_P,
  NEAR_P,
  WOOD_BLOOMS,
  WOOD_DRESS,
  WOOD_SHROOMS,
  WOOD_TREES,
} from './art';
import { TILE } from '../stage/art';

export const WOOD_THEME: StageTheme = {
  strips: [
    { key: 'wood-far', period: FOREST_P, speed: 0.06, y: 0, depth: 0.1, tint: 'hill' },
    { key: 'wood-mid', period: FOREST_P, speed: 0.16, y: 0, depth: 0.3, tint: 'hill' },
    { key: 'wood-near', period: NEAR_P, speed: 0.38, y: 0, depth: 0.4 },
    { key: 'wood-canopy', period: CANOPY_P, speed: 0.95, y: 0, depth: 0.75 },
  ],
  horizon: 'wood-far-mo',
  fence: { key: 'wood-brush', period: BRUSH_P, speed: 0.85, y: 0, depth: 0.7 },
  front: { key: 'wood-front', period: TILE, speed: 1.12, y: H + 6 },
  // two great trees, then a giant mushroom
  prop: (i) =>
    i % 3 === 1
      ? { key: `wood-shroom-${(i * 2) % WOOD_SHROOMS}`, size: 0.85 + ((i * 5) % 4) * 0.1 }
      : { key: `wood-tree-${i % WOOD_TREES}`, size: 1 + ((i * 7) % 3) * 0.06 },
  ground: { tile: 'wood-ground', end: 'wood-ground-end', pit: 'wood-pit' },
  dressing: (i) => `wood-dress-${(i * 5) % WOOD_DRESS}`,
  log: 'wood-log',
  trunk: 'wood-trunk',
  thorns: 'wood-thorns',
  bramble: 'wood-bramble',
  pad: (w) => `wood-pad-${w}`,
  stalk: (drop) => `wood-stalk-${drop}`,
  padShadow: 'wood-pad-shadow',
  sign: 'wood-sign',
  gate: 'wood-gate',
  bloom: (i) => `wood-bloom-${i % WOOD_BLOOMS}`,
  mood: (progress) => (progress < 0.5 ? 'dusk' : 'gloom'), // the night comes on slowly, halfway along
  moodSpeed: 0.16,
  moon: true,
};
