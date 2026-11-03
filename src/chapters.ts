// The game's chapters, in the order they are played. A chapter is a stage and then its boss, through the
// stage's gate. Everything the rest of the game needs to say or show about one lives in its profile here, so
// nothing else has to know whose chapter it is. (How a chapter's world looks is in
// src/game/views/chapterViews.ts.)
import type { Tune } from './audio';
import type { ParticleShape } from './presentation';
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
  // bossPhases: if he has a tune for each phase. boss is what his fight starts on.
  readonly tunes: {
    readonly stage: Tune;
    readonly boss: Tune;
    readonly bossPhases?: readonly [Tune, Tune, Tune];
  };
  // The boss's fight, in toasts: a hint as it starts (a touch screen can't aim, so it has its own), a line for
  // each new phase, 2 then 3, and one as he is cheered up.
  readonly fightHint: { readonly aim: string; readonly touch: string };
  readonly phaseToasts: readonly [string, string];
  readonly cheeredToast: string;
  readonly bounceHint?: string; // the one message on a stage with bounce pads, as its first one grows
  readonly shed: readonly [string, string]; // what he sheds as he leaves phase 1, then phase 2
  readonly shedShape: ParticleShape; // ...and what shape it is
  readonly cheeredColors: readonly string[]; // what bursts from him as he is cheered up
  readonly lose: { readonly stage: LoseText; readonly boss: LoseText };
  readonly win: WinText;
  // The boss on the HUD: his bar's colour in each phase, and his portrait's baked parts (src/game/hud/art.ts).
  readonly barColors: readonly [number, number, number];
  readonly portrait: { readonly angry: string; readonly joy: string };
  readonly portraitPhases?: readonly [string, string, string]; // if his portrait follows his phase
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
  shedShape: 'petal',
  cheeredColors: ['#ffd23f', '#ff8fb1', '#ffffff', '#ffb52e'],
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

// Chapter 2 is reached only through ?debug&chapter=2 until it goes live.
export const WOOD = {
  ...SUNFLOWER,
  id: 'wood',
  title: 'Chapter 2 · The Moody Mushroom',
  sign: 'Mushroom Wood',
  gate: "Mo's Hollow",
  stage: 'mushroomWood',
  boss: 'mo',
  tunes: { stage: 'wood', boss: 'moSulky', bossPhases: ['moSulky', 'moCross', 'moFurious'] },
  fightHint: {
    aim: 'He rears up to attack: hold ↑ and hit his face for double damage!',
    // a touch screen can't aim, but a straight seed in the air reaches his face
    touch: 'He rears up to attack: jump and hit his face for double damage!',
  },
  phaseToasts: ['Mo is getting cross!', 'Mo is FURIOUS!'],
  cheeredToast: 'Mo is beaming!',
  shed: ['#6a8cff', '#ff7a3c'], // the blue of his cap, then the orange
  shedShape: 'spot',
  cheeredColors: ['#ffc53f', '#ffe476', '#ffc9d8', '#fff0a0'],
  bounceHint: 'Bounce on it! Hold jump to go higher.',
  lose: {
    stage: {
      who: 'The Mushroom Wood is',
      progress: (percent) => `You made it ${percent}% of the way to Mo!`,
    },
    boss: {
      who: 'Mo is',
      progress: (percent) => `You cheered Mo up ${percent}% of the way!`,
    },
  },
  win: { badge: '🍄', line: 'Mo is all smiles, and the whole wood is aglow. What a hero, Pip!' },
  barColors: [0x5476ee, 0xf4652f, 0x9c4ef2], // his cap, as his mood turns
  portrait: { angry: 'bar-icon-mo-0', joy: 'bar-icon-mo-joy' },
  portraitPhases: ['bar-icon-mo-0', 'bar-icon-mo-1', 'bar-icon-mo-2'],
} as const satisfies Chapter;

export const CHAPTERS = [SUNFLOWER, WOOD] as const satisfies readonly Chapter[];
export type ChapterId = (typeof CHAPTERS)[number]['id'];
