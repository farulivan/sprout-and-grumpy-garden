// How each chapter's world looks. A chapter added to src/chapters.ts needs an entry here before the game
// compiles.
import type { Scene } from 'phaser';
import type { ChapterId } from '../../chapters';
import type { Stage } from '../../sim/stage/stage';
import { bakeLate } from '../art/bake';
import { GARDEN_THEME } from './stage/gardenTheme';
import { bakeWood } from './wood/art';
import { WOOD_THEME } from './wood/woodTheme';
import { StageWorldView, type StageDepths } from './stage/StageWorldView';
import { Ground } from './world/ground';
import { Land } from './world/land';
import { WorldView, type WorldDepths } from './WorldView';
import type { Mood } from './world/weather';
import { AcidTrail } from './mo/smoke';
import { HollowGround, HollowLand } from './wood/hollow';

export interface ChapterViews {
  // Make ready what only this chapter draws, the first time it is played.
  prepare?(scene: Scene): void;
  stageWorld(scene: Scene, stage: Stage, depth: StageDepths): StageWorldView;
  arena(scene: Scene, depth: WorldDepths): WorldView;
  // The light at the stage's gate: the stage fades out into it, and the boss's arena fades in from it.
  readonly gateLight: readonly [red: number, green: number, blue: number];
  // What the boss's attacks leave behind them, if they leave anything.
  trail?(scene: Scene, depth: number, soilDepth: number): AcidTrail;
}

const gardenArena = (scene: Scene, depth: WorldDepths) =>
  new WorldView(scene, depth, {
    land: (s, layer) => new Land(s, layer),
    ground: (s, d) => new Ground(s, d),
  });

const MO_MOODS: readonly Mood[] = ['dusk', 'gloom', 'tantrum'];

export const CHAPTER_VIEWS: Record<ChapterId, ChapterViews> = {
  sunflower: {
    stageWorld: (scene, stage, depth) => new StageWorldView(scene, stage, depth, GARDEN_THEME),
    arena: gardenArena,
    gateLight: [255, 248, 225], // the warm light of Sunny's meadow
  },
  wood: {
    prepare: (scene) => bakeLate(scene, 'wood', () => bakeWood(scene)),
    stageWorld: (scene, stage, depth) => new StageWorldView(scene, stage, depth, WOOD_THEME),
    arena: (scene, depth) =>
      new WorldView(scene, depth, {
        land: (s, layer) => new HollowLand(s, layer),
        ground: (s, d) => new HollowGround(s, d),
        night: true,
        startMood: 'dusk',
        mood: (fight) => (fight.boss.alive ? MO_MOODS[Math.min(fight.boss.phase, 3) - 1] : 'glow'),
      }),
    gateLight: [206, 220, 255], // moonlight, through the hollow
    trail: (scene, depth, soilDepth) => new AcidTrail(scene, depth, soilDepth),
  },
};
