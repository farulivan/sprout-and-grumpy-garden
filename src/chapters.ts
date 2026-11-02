// The game's chapters, in the order they are played. A chapter is a stage and then its boss, through the
// stage's gate. Everything the rest of the game needs to say or show about one lives in its profile here, so
// nothing else has to know whose chapter it is. (How a chapter's world looks is in
// src/game/views/chapterViews.ts.)
import type { Tune } from './audio';
import type { BossId } from './sim/bosses';
import type { StageId } from './sim/stage/stages';

// The lose card, for a level of the chapter: who is still grumpy, and how far Pip got.
export interface LoseText {
  readonly who: string; // "<who> still grumpy…"
  readonly progress: (percent: number) => string;
}
// The win card, once the boss is cheered up.
export interface WinText {
  readonly badge: string;
  readonly line: string;
}

export interface Chapter {
  readonly id: string; // names its scenes and its entry in chapterViews.ts
  readonly title: string; // shown over the stage's name as it begins
  readonly sign: string; // on the signpost at the start of the stage
  readonly gate: string; // over the gate at its end, where the boss is
  readonly stage: StageId;
  readonly boss: BossId;
  readonly tunes: { readonly stage: Tune; readonly boss: Tune };
  // The boss's fight, in toasts: a hint as it starts (a touch screen can't aim, so it has its own), a line for
  // each new phase, 2 then 3, and one as he is cheered up.
  readonly fightHint: { readonly aim: string; readonly touch: string };
  readonly phaseToasts: readonly [string, string];
  readonly cheeredToast: string;
  readonly shed: readonly [string, string]; // what he sheds as he leaves phase 1, then phase 2
  readonly lose: { readonly stage: LoseText; readonly boss: LoseText };
  readonly win: WinText;
  // The boss on the HUD: his bar's colour in each phase, and his portrait's baked parts (src/game/hud/art.ts).
  readonly barColors: readonly [number, number, number];
  readonly portrait: { readonly angry: string; readonly joy: string };
}

export const SUNFLOWER = {
  id: 'sunflower',
  title: 'Chapter 1 · The Grumpy Sunflower',
  sign: 'Garden Path',
  gate: "Sunny's Meadow",
  stage: 'gardenPath',
  boss: 'sunny',
  tunes: { stage: 'stage', boss: 'boss' },
  fightHint: {
    aim: 'Hold ↑ to aim at his face for double damage!',
    // a touch screen can't aim, but a straight seed from the high leaf reaches his face
    touch: 'Shoot his face from the high leaf: double damage!',
  },
  phaseToasts: ['Sunny is getting grumpier!', 'Sunny is SUPER grumpy!'],
  cheeredToast: 'Sunny is blooming!',
  shed: ['#ffc62e', '#ff982c'], // yellow petals, then orange
  lose: {
    stage: {
      who: 'The garden path is',
      progress: (percent) => `You made it ${percent}% of the way to Sunny!`,
    },
    boss: {
      who: 'Sunny is',
      progress: (percent) => `You cheered Sunny up ${percent}% of the way!`,
    },
  },
  win: { badge: '🌻', line: 'Sunny feels sunny again and the garden path is open. What a hero, Pip!' },
  barColors: [0xffd23f, 0xffa42e, 0xff5f3c], // the bar heats up with him
  portrait: { angry: 'bar-icon-sunny-angry', joy: 'bar-icon-sunny-joy' },
} as const satisfies Chapter;

export const CHAPTERS = [SUNFLOWER] as const satisfies readonly Chapter[];
export type ChapterId = (typeof CHAPTERS)[number]['id'];
