// What the views need from the level being played, whatever kind it is. A boss fight is one (fight.ts).
import type { Rect } from './math';
import type { Player } from './player';

export interface Level {
  readonly player: Player;
  readonly platforms: readonly Rect[];
  readonly cheering: boolean; // the level is won and Pip celebrates
}
