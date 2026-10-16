// Things that happen in the simulation that the outside world reacts to with sound, particles, shake or
// text. The simulation only announces them; src/presentation.ts decides what each one looks and sounds like.
import type { ProjectileKind } from './projectile';

export interface FightResult {
  time: number; // seconds of fight time
  hits: number; // times Pip was hurt
  stars: 1 | 2 | 3;
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
  | { type: 'lose'; progress: number }; // progress = how much of the boss's bar was emptied, 1-100
