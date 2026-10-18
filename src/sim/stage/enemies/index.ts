// Every small enemy a stage can place. Adding one = a new file next to these plus a line here.
import type { Enemy, EnemyKind } from './enemy';
import { Grumbud } from './grumbud';
import { PeaPod } from './peaPod';
import { Puffball } from './puffball';
import { Snapper } from './snapper';

// y: its feet (or, for a Puffball, the height it floats at). level: 1 is the gentlest, for Stage 1; later
// stages can ask for more (so far only the Pea Pod has a level 2).
export const ENEMIES: Record<EnemyKind, (x: number, y: number, level: number) => Enemy> = {
  grumbud: (x, y) => new Grumbud(x, y),
  puffball: (x, y) => new Puffball(x, y),
  peaPod: (x, y, level) => new PeaPod(x, y, level),
  snapper: (x, y) => new Snapper(x, y),
};
