// The Garden Path as a StageWorldView draws it. Its parts are baked in ./art.ts; the trees, tufts and flowers
// are the arena's (../world/).
import { H } from '../../../config';
import { BLOOMS, FAR_P, FENCE_P, HEDGES, MEADOW_P, TILE } from './art';
import type { StageTheme } from './StageWorldView';

export const GARDEN_THEME: StageTheme = {
  strips: [
    { key: 'stage-mountains', period: FAR_P, speed: 0.06, y: 0, depth: 0.1 },
    { key: 'stage-far', period: FAR_P, speed: 0.16, y: 0, depth: 0.3 },
    { key: 'stage-meadow', period: MEADOW_P, speed: 0.38, y: 0, depth: 0.4 },
  ],
  horizon: 'stage-far-sunny',
  fence: { key: 'stage-fence', period: FENCE_P, speed: 0.85, y: 0, depth: 0.7 },
  front: { key: 'stage-front-grass', period: TILE, speed: 1.12, y: H + 6 },
  home: { key: 'stage-cottage', x: 70, size: 0.82 }, // Pip's cottage
  // two trees, then a hedge
  prop: (i) =>
    i % 3 === 1
      ? { key: `stage-hedge-${i % HEDGES}` }
      : { key: `tree-${(i * 2) % 3}`, size: 0.85 + ((i * 7) % 4) * 0.08 },
  ground: { tile: 'stage-ground', end: 'stage-ground-end', pit: 'stage-pit' },
  dressing: (i) => (i % 3 === 0 ? `flower-${(i * 3) % 5}` : `tuft-${i % 3}`),
  log: 'stage-log',
  bramble: 'stage-thorns', // (nor any glades)
  thorns: 'stage-thorns',
  pad: (w) => `stage-pad-${w}`,
  stalk: (drop) => `stage-stalk-${drop}`,
  padShadow: 'stage-pad-shadow',
  sign: 'stage-sign',
  gate: 'stage-gate',
  bloom: (i) => `stage-bloom-${i % BLOOMS}`,
  mood: () => 'calm', // a fine morning all the way along the path
};
