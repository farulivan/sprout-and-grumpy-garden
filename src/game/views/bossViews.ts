// How each boss looks. A boss added to src/sim/bosses needs an entry here before the game compiles.
import type { Scene } from 'phaser';
import type { BossId } from '../../sim/bosses';
import type { Fight } from '../../sim/fight';
import type { FxTarget } from '../presenter';
import { MoView } from './MoView';
import { bakeSunny, SunnyView } from './SunnyView';

export interface BossView {
  // fight.boss is the boss to draw; the view may also look at the rest of the fight (where Pip is, say).
  sync(fight: Fight, alpha: number, dt: number): void;
}

export const BOSS_VIEWS: Record<
  BossId,
  // bake: as the game starts. A boss with none has his parts baked with his chapter's (see chapterViews.ts).
  { bake?(scene: Scene): void; create(scene: Scene, depth: number, fx: FxTarget): BossView }
> = {
  sunny: { bake: bakeSunny, create: (scene, depth, fx) => new SunnyView(scene, depth, fx) },
  mo: { create: (scene, depth, fx) => new MoView(scene, depth, fx) },
};
