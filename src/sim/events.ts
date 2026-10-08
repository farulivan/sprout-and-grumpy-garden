// Things that happen in the simulation that the outside world reacts to with sound, particles, shake or
// text. The simulation only announces them; src/presentation.ts decides what each one looks and sounds like.
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
  | { type: 'telegraph' }
  | { type: 'spit' }
  | { type: 'petals' }
  | { type: 'introRoar' }
  | { type: 'fightStart' }
  | { type: 'phase'; phase: number; x: number; y: number }
  | { type: 'groundPuff'; x: number }
  | { type: 'pickup'; x: number; y: number }
  | { type: 'bossDefeated'; x: number; y: number }
  | { type: 'confetti' }
  | { type: 'playerDown' }
  | { type: 'win'; result: FightResult }
  | { type: 'lose'; progress: number }; // progress = how much of the boss's bar was emptied, 1-100
