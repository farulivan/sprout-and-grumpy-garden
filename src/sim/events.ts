// Things that happen in the simulation that the outside world reacts to with sound, particles, shake or
// text. The simulation only announces them; src/presentation.ts decides what each one looks and sounds like.
import type { ProjectileKind } from './projectile';
import type { EnemyKind } from './stage/enemies/enemy';

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
  seeds: number; // golden seeds found
  easy: boolean;
}

export type SimEvent =
  | { type: 'jump'; x: number; y: number }
  | { type: 'land'; x: number; y: number }
  | { type: 'shoot' }
  | { type: 'playerHurt'; x: number; y: number }
  | { type: 'bossHit'; x: number; y: number; weak: boolean } // weak = the double-damage spot
  | { type: 'bossBlock'; x: number; y: number } // a seed hit him while he can't be hurt, and bounced off
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
  | { type: 'enemyWarn'; x: number; y: number } // the "!" before a small enemy attacks
  | { type: 'pea'; x: number; y: number }
  | { type: 'snap'; x: number; y: number }
  | { type: 'pitFall'; x: number }
  | { type: 'goldenSeed'; x: number; y: number; found: number; total: number }
  | { type: 'stageClear'; x: number; y: number; result: StageResult } // Pip reached the gate
  | { type: 'stageExit' }; // ...and has walked through it: on to the boss
