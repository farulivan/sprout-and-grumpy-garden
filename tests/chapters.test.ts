// What the rest of the game reads from a chapter's profile.
import { describe, expect, it } from 'vitest';
import { CHAPTERS, SUNFLOWER, type Chapter } from '../src/chapters';
import { present, type Presenter, type Ring } from '../src/presentation';
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
    rings: Ring[] = [];
  const presenter: Presenter = {
    sfx() {},
    music() {},
    burst() {},
    ring: (_x, _y, ring) => rings.push(ring),
    shake() {},
    flash() {},
    punch() {},
    hitStop() {},
    toast: (text) => toasts.push(text),
  };
  present(e, presenter, { touch, chapter });
  return { toasts, rings };
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

  it('sheds the colour of the phase just left', () => {
    expect(shown({ type: 'phase', phase: 2, x: 0, y: 0 }, OTHER).rings[0].color).toBe('#111111');
    expect(shown({ type: 'phase', phase: 3, x: 0, y: 0 }, OTHER).rings[0].color).toBe('#222222');
  });
});
