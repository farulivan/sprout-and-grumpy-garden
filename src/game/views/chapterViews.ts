// How each chapter's world looks. A chapter added to src/chapters.ts needs an entry here before the game
// compiles.
import type { Scene } from 'phaser';
import type { ChapterId } from '../../chapters';
import type { Stage } from '../../sim/stage/stage';
import { GARDEN_THEME } from './stage/gardenTheme';
import { StageWorldView, type StageDepths } from './stage/StageWorldView';
import { Ground } from './world/ground';
import { Land } from './world/land';
import { WorldView, type WorldDepths } from './WorldView';

export interface ChapterViews {
  stageWorld(scene: Scene, stage: Stage, depth: StageDepths): StageWorldView;
  arena(scene: Scene, depth: WorldDepths): WorldView;
  // The light at the stage's gate: the stage fades out into it, and the boss's arena fades in from it.
  readonly gateLight: readonly [red: number, green: number, blue: number];
}

export const CHAPTER_VIEWS: Record<ChapterId, ChapterViews> = {
  sunflower: {
    stageWorld: (scene, stage, depth) => new StageWorldView(scene, stage, depth, GARDEN_THEME),
    arena: (scene, depth) =>
      new WorldView(scene, depth, {
        land: (s, layer) => new Land(s, layer),
        ground: (s, d) => new Ground(s, d),
      }),
    gateLight: [255, 248, 225], // the warm light of Sunny's meadow
  },
};
