// Things that happen in the simulation that the outside world reacts to with sound, particles, shake or
// text. The simulation only announces them; src/presentation.ts decides what each one looks and sounds like.
import type { ProjectileKind } from './projectile';
import type { EnemyKind } from './stage/enemies/enemy';
import type { TitleCue } from './yard';

export interface FightResult {
  time: number; // seconds of fight time
  hits: number; // times Pip was hurt
  stars: 1 | 2 | 3;
  easy: boolean;
}

// How a stage went, at its gate. The hearts left go on into the boss fight.
export interface StageResult {
  time: number; // seconds from the start to the gate
  hits: number; // times Pip was hurt; a fall into a pit counts
  hearts: number;
  easy: boolean;
}

export type SimEvent =
  | { type: 'jump'; x: number; y: number }
  | { type: 'bounce'; x: number; y: number } // Pip came down on a bounce pad
  | { type: 'land'; x: number; y: number }
  | { type: 'shoot' }
  | { type: 'playerHurt'; x: number; y: number }
  | { type: 'bossHit'; x: number; y: number; weak: boolean } // weak = the double-damage spot
  | { type: 'bossBlock'; x: number; y: number } // a seed hit him while he can't be hurt, and bounced off
  | { type: 'bossLand'; x: number; y: number; acid: boolean } // a boss's whole weight came down, with his poison?
  | { type: 'telegraph' }
  | { type: 'spit' }
  | { type: 'petals' }
  | { type: 'introRoar' }
  | { type: 'fightStart' }
  | { type: 'phase'; phase: number; x: number; y: number }
  | { type: 'groundPuff'; x: number; kind: ProjectileKind } // a seed or petal of Sunny's hit the ground
  | { type: 'pickup'; x: number; y: number; healed: boolean } // healed = false when Pip's hearts were full
  | { type: 'bossDefeated'; x: number; y: number }
  | { type: 'confetti' }
  | { type: 'playerDown' }
  | { type: 'win'; result: FightResult }
  | { type: 'lose'; progress: number } // how far Pip got, 1-100: of the boss's bar, or of the stage's path
  // On a stage:
  | { type: 'enemyHit'; x: number; y: number }
  | { type: 'enemyCheered'; kind: EnemyKind; x: number; y: number; baseY: number } // it pops into a flower
  | { type: 'enemyBlock'; x: number; y: number } // a seed bounced off something hiding
  | { type: 'enemyBurst'; x: number; y: number } // it touched Pip, which used it up
  | { type: 'enemyWarn'; x: number; y: number } // the "!" before a small enemy attacks
  | { type: 'pea'; x: number; y: number }
  | { type: 'snap'; x: number; y: number }
  | { type: 'pitFall'; x: number }
  | { type: 'padReady'; x: number; y: number; first: boolean } // a cheered-up plant stays as a bounce pad
  | { type: 'thud'; x: number; y: number } // something heavy stopped: a Burr at a wall, a Dropcap on the ground
  | { type: 'gladeClose'; x0: number; x1: number } // brambles shut Pip in until every plant is cheered up
  | { type: 'gladeWave'; x0: number; x1: number; wave: number } // the next plants arrive (wave 2, then 3...)
  | { type: 'gladeOpen'; x0: number; x1: number } // ...and the brambles wither
  // found: toward the next heart (see SEEDS_PER_HEART); healed: on the seed that makes a heart, whether there
  // was an empty heart to fill
  | { type: 'goldenSeed'; x: number; y: number; found: number; healed?: boolean }
  | { type: 'stageClear'; x: number; y: number; result: StageResult } // Pip reached the gate
  | { type: 'stageExit' } // ...and has walked through it: on to the boss
  // In Pip's yard behind the title: a moment in the opening (a seed landing, the logo stamping down)
  | { type: 'cue'; cue: TitleCue };
