// Pip's front yard behind the title (src/sim/yard.ts): the opening plays the same every time, a skip lands
// where the opening would have, and Pip stays in the picture until Play sends him off.
import { expect, it } from 'vitest';
import { STEP, W } from '../../src/config';
import { HOME_X, INTRO, PRESS_GUARD, STING, Yard } from '../../src/sim/yard';

const run = (yard: Yard, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) yard.step();
};

it('plays the sting, then the opening, then waits on the title', () => {
  const yard = new Yard();
  expect(yard.beat).toBe('sting');
  expect(yard.shown).toBe(false); // Pip is still indoors
  run(yard, STING + 0.1);
  expect(yard.beat).toBe('intro');
  run(yard, INTRO.hop);
  expect(yard.shown).toBe(true);
  run(yard, INTRO.end - INTRO.hop);
  expect(yard.beat).toBe('press');
  expect(yard.ready).toBe(true);
});

it('plays the opening the same way every time', () => {
  const a = new Yard(),
    b = new Yard();
  const trace = (yard: Yard) =>
    Array.from({ length: 600 }, () => {
      yard.step();
      return `${yard.player.x.toFixed(3)},${yard.player.y.toFixed(3)}`;
    });
  expect(trace(a)).toEqual(trace(b));
});

it('ends the opening with Pip standing on his mark, where a skip puts him', () => {
  const watched = new Yard();
  run(watched, STING + INTRO.end);
  const p = watched.player;
  expect(p.onGround).toBe(true);
  expect(Math.abs(p.vx)).toBeLessThan(1);
  expect(Math.abs(p.x - HOME_X)).toBeLessThan(3);
  expect(p.facing).toBe(1);

  const skipped = new Yard();
  run(skipped, 1);
  skipped.skip();
  expect(skipped.beat).toBe('press');
  expect(skipped.player.x).toBe(HOME_X);
  expect(skipped.shown).toBe(true);
});

it('ignores Start for a moment after a skip, so one mashed key does not do both', () => {
  const yard = new Yard();
  yard.skip();
  expect(yard.ready).toBe(false);
  run(yard, PRESS_GUARD + 0.05);
  expect(yard.ready).toBe(true);
});

it('keeps Pip in the picture while the title and the menu wait', () => {
  const yard = new Yard();
  let lo = Infinity,
    hi = -Infinity;
  for (let i = 0; i < 120 / STEP; i++) {
    yard.step();
    if (yard.beat === 'press' && yard.t > 40) yard.toMenu();
    if (yard.shown) {
      lo = Math.min(lo, yard.player.x);
      hi = Math.max(hi, yard.player.x);
    }
  }
  expect(yard.beat).toBe('menu');
  expect(lo).toBeGreaterThan(100);
  expect(hi).toBeLessThan(W - 100);
});

it('sends Pip off down the path when Play is pressed', () => {
  const yard = new Yard({ beat: 'menu' });
  expect(yard.shown).toBe(true);
  yard.leave();
  let t = 0;
  while (!yard.done && t < 3) {
    yard.step();
    t += STEP;
  }
  expect(yard.done).toBe(true);
  expect(t).toBeLessThan(1.5);
  expect(yard.player.vx).toBeGreaterThan(200); // still running when the game takes over
  expect(yard.player.x).toBeGreaterThan(HOME_X + 150);
});

it('announces each moment of the opening once, for its sounds, and none that a skip passed', () => {
  const cues = (yard: Yard, seconds: number) => {
    const heard: string[] = [];
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      yard.step();
      for (const e of yard.drainEvents()) if (e.type === 'cue') heard.push(e.cue);
    }
    return heard;
  };
  expect(cues(new Yard(), STING + INTRO.end + 1)).toEqual(['seed', 'sprout', 'door', 'logo', 'stamp']);

  const skipped = new Yard();
  cues(skipped, 0.5);
  skipped.skip();
  expect(cues(skipped, 10)).toEqual([]);
});
