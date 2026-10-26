// The garden's weather follows the boss's mood (src/game/views/world/weather.ts). It is the one piece of
// the drawing code that is plain logic, so it can be checked without a browser.
import { expect, it } from 'vitest';
import { MOODS, moodOf, Weather } from '../src/game/views/world/weather';
import { Fight } from '../src/sim/fight';
import { NO_INPUT } from '../src/sim/input';

it('takes its mood from the fight: calm, grumpy, stormy, then bloom', () => {
  const fight = new Fight({ seed: 1 });
  for (let i = 0; i < 110; i++) fight.step(NO_INPUT); // past "Ready? GO!"
  const boss = fight.boss;
  expect(moodOf(fight)).toBe('calm');

  boss.hp = Math.floor(boss.maxHp * 0.66) + 1;
  boss.hit(2);
  expect(moodOf(fight)).toBe('grumpy');

  boss.inv = 0;
  boss.hp = Math.floor(boss.maxHp * 0.33) + 1;
  boss.hit(2);
  expect(moodOf(fight)).toBe('stormy');

  boss.inv = 0;
  boss.hp = 1;
  boss.hit(2);
  expect(moodOf(fight)).toBe('bloom');
});

it('turns gradually, and the moods always blend to a whole', () => {
  const weather = new Weather();
  const total = () => MOODS.reduce((sum, mood) => sum + weather.weight[mood], 0);
  expect(weather.weight.calm).toBe(1);

  for (let i = 0; i < 30; i++) weather.update('stormy', 1 / 60); // half a second in
  expect(total()).toBeCloseTo(1);
  expect(weather.weight.stormy).toBeGreaterThan(0.5);
  expect(weather.weight.stormy).toBeLessThan(0.9);
  expect(weather.look.ceiling).toBeGreaterThan(0);
  expect(weather.look.ceiling).toBeLessThan(1);

  for (let i = 0; i < 600; i++) weather.update('stormy', 1 / 60); // long enough to settle
  expect(total()).toBeCloseTo(1);
  expect(weather.weight.stormy).toBeCloseTo(1, 4);
  expect(weather.look.ceiling).toBeCloseTo(1, 3);
  expect(weather.look.cloudTint).toBe(0x8f88b8);
});

it('ends up in the same weather however long each frame is', () => {
  const smooth = new Weather(),
    choppy = new Weather();
  for (let i = 0; i < 120; i++) smooth.update('grumpy', 1 / 120);
  for (let i = 0; i < 20; i++) choppy.update('grumpy', 1 / 20);
  expect(choppy.weight.grumpy).toBeCloseTo(smooth.weight.grumpy, 6);
});

it('comes to rest once it has turned, and stirs again when the mood changes', () => {
  const weather = new Weather();
  for (let i = 0; i < 900; i++) weather.update('stormy', 1 / 60); // fifteen seconds: long settled
  expect(weather.weight).toEqual({ calm: 0, grumpy: 0, stormy: 1, bloom: 0, dawn: 0 }); // exactly, not nearly
  expect(weather.look.ceiling).toBe(1);

  const resting = { ...weather.look };
  weather.update('stormy', 1 / 60);
  expect(weather.look).toEqual(resting);

  weather.update('bloom', 1 / 60);
  expect(weather.weight.bloom).toBeGreaterThan(0);
  expect(weather.weight.stormy).toBeLessThan(1);
  expect(weather.look.rainbow).toBeGreaterThan(0);
});

it('dawns: snaps straight to a look, then blends from it to a clear morning', () => {
  const weather = new Weather();
  weather.snap('dawn');
  expect(weather.weight.dawn).toBe(1);
  expect(weather.look.sun).toBeLessThan(1);
  for (let i = 0; i < 60; i++) weather.update('calm', 1 / 60);
  expect(weather.weight.calm).toBeGreaterThan(0.8);
  expect(MOODS.reduce((sum, mood) => sum + weather.weight[mood], 0)).toBeCloseTo(1);
});
