// Stage 2: the shady wood to Mo's Hollow, about 9,000 px. Its one new idea is the bounce: a few seeds turn a
// grumpy Capling into a pad, so shooting builds Pip's way on as well as clearing it. In order: a trunk that
// only a bounce gets over, a pit too wide to jump, Burrs to hop, a glade that shuts until every plant in it is
// cheered up, the canopy's falling Dropcaps with a high road for those who bounce, a run of pits with Toadlets
// hopping across them, a harder glade, and a last dash to the gate. x is a world position, and the ground is
// at GROUND.
import { GROUND } from '../../../config';
import type { StageData } from '../stage';

export const mushroomWood: StageData = {
  name: 'The Mushroom Wood',
  length: 9200,
  startX: 120,
  gateX: 8960,
  safeEdge: 150, // its pits come quickly: Pip comes back with room to land from his hop and run up again
  ground: [
    [-40, 1500],
    [1800, 5900], // the first wide pit: 300 px, which only a bounce crosses
    [6050, 6420], // the pit run: these two are a plain jump...
    [6590, 6860],
    [7160, 9240], // ...and the last only a bounce crosses, with a golden seed at the top of a held one
  ],
  logs: [
    { x: 2040, w: 66, h: 30 }, // the first Burr stops here
    { x: 2640, w: 70, h: 30 },
    { x: 8530, w: 66, h: 30 },
  ],
  // too tall to jump, so the Capling before each has to be bounced on
  trunks: [
    { x: 800, w: 70, h: 200 },
    { x: 5630, w: 70, h: 200 },
  ],
  platforms: [
    // the canopy's high road: a bounce up, then hops along it, and it clears the trunk at its end
    { x: 4440, y: 236, w: 150, h: 22 },
    { x: 4770, y: 236, w: 140, h: 22 },
    { x: 5090, y: 236, w: 150, h: 22 },
    { x: 5420, y: 236, w: 140, h: 22 },
  ],
  thorns: [{ x: 4960, w: 72 }],
  glades: [
    { x0: 3150, x1: 4110 },
    { x0: 7300, x1: 8260 },
  ],
  enemies: [
    // the way in
    { kind: 'capling', x: 640 },
    // the first wide pit
    { kind: 'capling', x: 1490 },
    // Burr alley
    { kind: 'burr', x: 2300 },
    { kind: 'burr', x: 2560 },
    { kind: 'burr', x: 2800 },
    { kind: 'grumbud', x: 2900 },
    { kind: 'burr', x: 3060 },
    // the first glade: Grumbuds, then the Puffballs drift in
    { kind: 'grumbud', x: 3600, glade: 0 },
    { kind: 'grumbud', x: 3780, glade: 0 },
    { kind: 'grumbud', x: 3960, glade: 0 },
    { kind: 'puffball', x: 3500, y: 300, glade: 0, wave: 1 },
    { kind: 'puffball', x: 3760, y: 280, glade: 0, wave: 1 },
    { kind: 'puffball', x: 4020, y: 300, glade: 0, wave: 1 },
    // the canopy
    { kind: 'capling', x: 4330 },
    { kind: 'snapper', x: 4500 },
    { kind: 'dropcap', x: 4600, y: 150 },
    { kind: 'snapper', x: 4800 },
    { kind: 'burr', x: 5170 },
    { kind: 'dropcap', x: 5060, y: 170 },
    { kind: 'snapper', x: 5240 },
    { kind: 'dropcap', x: 5340, y: 150 },
    { kind: 'capling', x: 5430 },
    // the pit run
    { kind: 'toadlet', x: 6240 },
    { kind: 'burr', x: 6330 },
    { kind: 'toadlet', x: 6400 },
    { kind: 'peaPod', x: 6390, level: 2 },
    { kind: 'toadlet', x: 6620 },
    { kind: 'toadlet', x: 6760 },
    { kind: 'capling', x: 6850 },
    // the second glade: everything so far, in two waves
    { kind: 'burr', x: 8080, glade: 1 },
    { kind: 'burr', x: 7520, glade: 1 },
    { kind: 'grumbud', x: 7800, glade: 1 },
    { kind: 'puffball', x: 7920, y: 300, glade: 1 },
    { kind: 'toadlet', x: 7960, glade: 1, wave: 1 },
    { kind: 'toadlet', x: 7620, glade: 1, wave: 1 },
    { kind: 'burr', x: 7880, glade: 1, wave: 1 },
    { kind: 'dropcap', x: 7760, y: 170, glade: 1, wave: 1 },
    { kind: 'snapper', x: 7420, glade: 1, wave: 1 }, // one at each end, so Pip has to cross the glade
    { kind: 'snapper', x: 8190, glade: 1, wave: 1 },
    { kind: 'peaPod', x: 8040, level: 2, glade: 1, wave: 1 },
    { kind: 'puffball', x: 7560, y: 280, glade: 1, wave: 1 },
    // the last dash
    { kind: 'toadlet', x: 8400 },
    { kind: 'burr', x: 8480 },
    { kind: 'burr', x: 8620 },
    { kind: 'burr', x: 8800 },
    { kind: 'burr', x: 8920 },
  ],
  dewdrops: [
    [5170, 206], // on the high road
    [6720, GROUND - 100], // between the pits, on a hop
  ],
  seeds: [
    [2340, GROUND - 100], // over Burr alley, on a hop
    [4840, 190], // on the high road
    [7030, 170], // over the last pit, at the top of a held bounce
  ],
};
