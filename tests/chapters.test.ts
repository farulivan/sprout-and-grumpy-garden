// What the rest of the game reads from a chapter's profile.
import { describe, expect, it } from 'vitest';
import type { Tune } from '../src/audio';
import { CHAPTERS, SUNFLOWER, WOOD, type Chapter } from '../src/chapters';
import { present, type Burst, type Presenter, type Ring, type SfxName } from '../src/presentation';
import { BOSSES } from '../src/sim/bosses';
import type { SimEvent } from '../src/sim/events';
import { STAGES } from '../src/sim/stage/stages';

// Another chapter, with different words and colours in every place the game shows them.
const OTHER: Chapter = {
  ...SUNFLOWER,
  fightHint: { aim: 'Aim hint', touch: 'Touch hint' },
  phaseToasts: ['Phase two', 'Phase three'],
  cheeredToast: 'Cheered up',
  shed: ['#111111', '#222222'],
};

// What an event shows, played through present() with the given chapter.
function shown(e: SimEvent, chapter: Chapter, touch = false) {
  const toasts: string[] = [],
    rings: Ring[] = [],
    tunes: Tune[] = [],
    sounds: SfxName[] = [],
    bursts: Burst[] = [];
  const presenter: Presenter = {
    sfx: (name) => sounds.push(name),
    music() {},
    tune: (name) => tunes.push(name),
    burst: (_x, _y, burst) => bursts.push(burst),
    ring: (_x, _y, ring) => rings.push(ring),
    shake() {},
    flash() {},
    punch() {},
    hitStop() {},
    toast: (text) => toasts.push(text),
  };
  present(e, presenter, { touch, chapter });
  return { toasts, rings, tunes, sounds, bursts };
}

describe('chapters', () => {
  it('each names a stage and a boss that exist, once each', () => {
    for (const c of CHAPTERS) {
      expect(STAGES).toHaveProperty(c.stage);
      expect(BOSSES).toHaveProperty(c.boss);
    }
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
  });

  it('starts with the Garden Path and Sunny', () => {
    expect(CHAPTERS[0]).toMatchObject({ stage: 'gardenPath', boss: 'sunny' });
  });
});

describe('present', () => {
  it("speaks the chapter's words as the fight goes on", () => {
    const fightStart: SimEvent = { type: 'fightStart' };
    expect(shown(fightStart, OTHER).toasts).toEqual(['Aim hint']);
    expect(shown(fightStart, OTHER, true).toasts).toEqual(['Touch hint']);
    expect(shown({ type: 'phase', phase: 2, x: 0, y: 0 }, OTHER).toasts).toEqual(['Phase two']);
    expect(shown({ type: 'phase', phase: 3, x: 0, y: 0 }, OTHER).toasts).toEqual(['Phase three']);
    expect(shown({ type: 'bossDefeated', x: 0, y: 0 }, OTHER).toasts).toEqual(['Cheered up']);
  });

  it('changes tune with each phase only for a boss who has a tune for each', () => {
    const phase = (n: number): SimEvent => ({ type: 'phase', phase: n, x: 0, y: 0 });
    expect(shown(phase(2), SUNFLOWER).tunes).toEqual([]);
    expect(shown(phase(2), WOOD).tunes).toEqual(['moCross']);
    expect(shown(phase(3), WOOD).tunes).toEqual(['moFurious']);
    // a fight starts on the first, whichever way it is started
    expect(WOOD.tunes.boss).toBe(WOOD.tunes.bossPhases[0]);
  });

  it("bursts in the chapter's own shapes and colours", () => {
    const phase: SimEvent = { type: 'phase', phase: 2, x: 0, y: 0 },
      cheered: SimEvent = { type: 'bossDefeated', x: 0, y: 0 };
    expect(shown(phase, SUNFLOWER).bursts[0].shape).toBe('petal');
    expect(shown(phase, WOOD).bursts[0].shape).toBe('spot');
    expect(shown(cheered, SUNFLOWER).bursts[0]).toMatchObject({
      shape: 'petal',
      colors: SUNFLOWER.cheeredColors,
    });
    expect(shown(cheered, WOOD).bursts[0]).toMatchObject({ shape: 'spot', colors: WOOD.cheeredColors });
  });

  it("sounds each of the Fairy Ring's moments, and only a hop brings acid with it", () => {
    expect(shown({ type: 'ringSeek' }, WOOD).sounds).toEqual(['rumble']);
    expect(shown({ type: 'ringWarn' }, WOOD).sounds).toEqual(['ringUp']);
    expect(shown({ type: 'ringErupt', x: 0 }, WOOD).sounds).toEqual(['erupt']);
    expect(shown({ type: 'bossLand', x: 0, y: 0, acid: true }, WOOD).sounds).toEqual(['thud', 'acid']);
    expect(shown({ type: 'bossLand', x: 0, y: 0, acid: false }, WOOD).sounds).toEqual(['thud']);
  });

  it('pops a spore pod with its own sound, not a cheer', () => {
    const popped = shown({ type: 'enemyCheered', kind: 'spore', x: 0, y: 0, baseY: 0 }, WOOD);
    expect(popped.sounds).toEqual(['pop']);
    expect(shown({ type: 'enemyBurst', kind: 'spore', x: 0, y: 0 }, WOOD).sounds).toEqual(['pop']);
  });

  it('sheds the colour of the phase just left', () => {
    expect(shown({ type: 'phase', phase: 2, x: 0, y: 0 }, OTHER).rings[0].color).toBe('#111111');
    expect(shown({ type: 'phase', phase: 3, x: 0, y: 0 }, OTHER).rings[0].color).toBe('#222222');
  });
});
