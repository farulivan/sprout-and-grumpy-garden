// Stage 1: the garden path from Pip's cottage to Sunny's meadow. Each stretch teaches one thing, in the order
// the boss will test them: shooting, jumping up onto leaf pads, aiming up, reading the "!", then a pit, then
// all of it together before Sunny's gate. Everything is placed by hand; x is a world position, and the ground
// is at GROUND.
import { GROUND } from '../../../config';
import type { StageData } from '../stage';

export const gardenPath: StageData = {
  name: 'The Garden Path',
  length: 7300,
  startX: 120,
  gateX: 7060,
  ground: [
    [-40, 5000],
    [5130, 7340], // the one pit, 130 px wide, with a leaf pad over it
  ],
  logs: [
    { x: 560, w: 66, h: 30 }, // the first hop, before anything can hurt
    { x: 2060, w: 70, h: 30 },
    { x: 3360, w: 66, h: 30 },
  ],
  platforms: [
    { x: 2250, y: 360, w: 150, h: 22 }, // a held jump up, with a Grumbud patrolling it
    { x: 2500, y: 292, w: 140, h: 22 }, // a hop higher: a golden seed
    { x: 4985, y: 380, w: 150, h: 22 }, // over the pit
    { x: 6800, y: 356, w: 140, h: 22 }, // the last dewdrop, before the gate
  ],
  thorns: [
    { x: 4700, w: 72 },
    { x: 6500, w: 64 },
  ],
  enemies: [
    // shooting
    { kind: 'grumbud', x: 1250 },
    { kind: 'grumbud', x: 1720 },
    { kind: 'grumbud', x: 1840 },
    // leaf pads
    { kind: 'grumbud', x: 2320, y: 360 },
    { kind: 'grumbud', x: 2740 },
    // aiming up
    { kind: 'puffball', x: 3150, y: 300 },
    { kind: 'puffball', x: 3540, y: 320 },
    { kind: 'grumbud', x: 3740 },
    // the "!"
    { kind: 'peaPod', x: 4200 },
    { kind: 'snapper', x: 4500 },
    // the pit
    { kind: 'puffball', x: 5280, y: 300 },
    // all together, with one twist: this pod spits two peas after each "!"
    { kind: 'grumbud', x: 5900 },
    { kind: 'puffball', x: 6160, y: 310 },
    { kind: 'peaPod', x: 6380, level: 2 },
  ],
  dewdrops: [
    [5450, GROUND - 30],
    [6870, 326], // on the last leaf pad
  ],
  seeds: [
    [760, GROUND - 36], // in plain sight on the path
    [2570, 250], // over the higher leaf pad
    [5060, 330], // over the pit
  ],
};
