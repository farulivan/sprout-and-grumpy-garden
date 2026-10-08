// How each boss looks. A boss added to src/sim/bosses needs an entry here before the game compiles.
import type { Scene } from 'phaser';
import type { Boss } from '../../sim/boss';
import type { BossId } from '../../sim/bosses';
import { bakeSunny, SunnyView } from './SunnyView';

export interface BossView {
  sync(boss: Boss, alpha: number, dt: number): void;
  setVisible(visible: boolean): void;
}

export const BOSS_VIEWS: Record<
  BossId,
  { bake(scene: Scene): void; create(scene: Scene, depth: number): BossView }
> = {
  sunny: { bake: bakeSunny, create: (scene, depth) => new SunnyView(scene, depth) },
};
