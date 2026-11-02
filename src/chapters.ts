// The game's chapters, in the order they are played. A chapter is a stage and then its boss, through the
// stage's gate. Everything the rest of the game needs to say or show about one lives in its profile here, so
// nothing else has to know whose chapter it is. (How a chapter's world looks is in
// src/game/views/chapterViews.ts.)
import type { Tune } from './audio';
import type { BossId } from './sim/bosses';
import type { StageId } from './sim/stage/stages';

export interface Chapter {
  readonly id: string; // names its scenes and its entry in chapterViews.ts
  readonly title: string; // shown over the stage's name as it begins
  readonly stage: StageId;
  readonly boss: BossId;
  readonly tunes: { readonly stage: Tune; readonly boss: Tune };
}

export const SUNFLOWER = {
  id: 'sunflower',
  title: 'Chapter 1 · The Grumpy Sunflower',
  stage: 'gardenPath',
  boss: 'sunny',
  tunes: { stage: 'stage', boss: 'boss' },
} as const satisfies Chapter;

export const CHAPTERS = [SUNFLOWER] as const satisfies readonly Chapter[];
export type ChapterId = (typeof CHAPTERS)[number]['id'];
