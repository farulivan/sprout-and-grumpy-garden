import { expect, it } from 'vitest';
import { createSave } from '../src/save';

function memoryStore(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

it('starts with sound on, normal mode and no best time', () => {
  const save = createSave(memoryStore());
  expect([save.easy, save.muted, save.best('sunny')]).toEqual([false, false, null]);
});

it('remembers settings and the best time across visits', () => {
  const store = memoryStore();
  const first = createSave(store);
  first.easy = true;
  first.muted = true;
  expect(first.recordWin('sunny', 48.26)).toBe(true);

  const second = createSave(store);
  expect([second.easy, second.muted, second.best('sunny')]).toEqual([true, true, 48.3]);
});

it('only keeps a time that beats the best', () => {
  const save = createSave(memoryStore());
  save.recordWin('sunny', 50);
  expect(save.recordWin('sunny', 61)).toBe(false);
  expect(save.best('sunny')).toBe(50);
  expect(save.recordWin('sunny', 44.4)).toBe(true);
  expect(save.best('sunny')).toBe(44.4);
});

it("brings over the original game's three keys, then removes them", () => {
  const store = memoryStore({ 'sprout.easy': '1', 'sprout.muted': '0', 'sprout.best': '52.4' });
  const save = createSave(store);
  expect([save.easy, save.muted, save.best('sunny')]).toEqual([true, false, 52.4]);
  save.muted = true; // the first change writes the new format
  expect([...store.items.keys()]).toEqual(['sprout.save']);
  expect(createSave(store).best('sunny')).toBe(52.4);
});

it('starts fresh from an unreadable save', () => {
  const save = createSave(memoryStore({ 'sprout.save': '{not json' }));
  expect([save.easy, save.muted, save.best('sunny')]).toEqual([false, false, null]);
});

it('keeps working when storage is missing or throws', () => {
  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  for (const store of [null, broken]) {
    const save = createSave(store);
    save.easy = true;
    expect(save.easy).toBe(true);
    expect(save.recordWin('sunny', 40)).toBe(true);
    expect(save.best('sunny')).toBe(40);
  }
});

it('a build with a save slot keeps its own save and leaves the main one alone', () => {
  const store = memoryStore();
  const main = createSave(store);
  main.recordWin('sunny', 50);

  const old = createSave(store, 'v1'); // another copy of the game, on the same domain
  expect(old.best('sunny')).toBe(null);
  old.easy = true;
  old.recordWin('sunny', 61);
  expect([...store.items.keys()].sort()).toEqual(['sprout.save', 'sprout.save.v1']);

  const again = createSave(store);
  expect([again.easy, again.best('sunny')]).toEqual([false, 50]);
  expect(createSave(store, 'v1').best('sunny')).toBe(61);
});

it("a build with a save slot leaves the original game's keys untouched", () => {
  const store = memoryStore({ 'sprout.easy': '1', 'sprout.best': '52.4' });
  const slotted = createSave(store, 'v1');
  expect([slotted.easy, slotted.best('sunny')]).toEqual([false, null]);
  slotted.muted = true;
  expect(store.items.get('sprout.best')).toBe('52.4');
  expect(createSave(store).best('sunny')).toBe(52.4); // still there for the main save to bring over
});

it("remembers each stage's fastest clear", () => {
  const store = memoryStore();
  const first = createSave(store);
  expect(first.stageBest('gardenPath')).toBe(null);
  expect(first.recordStage('gardenPath', 60.04)).toBe(true);
  expect(first.recordStage('gardenPath', 71)).toBe(false);
  expect(createSave(store).stageBest('gardenPath')).toBe(60);
});

it('reads a save from before there were stages as having none cleared', () => {
  const save = createSave(
    memoryStore({ 'sprout.save': '{"v":1,"easy":true,"muted":false,"best":{"sunny":50}}' }),
  );
  expect([save.easy, save.best('sunny')]).toEqual([true, 50]);
  expect(save.stageBest('gardenPath')).toBe(null);
});

it('leaves out what an earlier version kept and this one no longer does', () => {
  const store = memoryStore({
    'sprout.save': JSON.stringify({
      v: 1,
      easy: false,
      muted: false,
      best: {},
      stages: { gardenPath: { best: 60, seeds: [true, false, true] } }, // golden seeds found
      reached: { sunny: true }, // bosses walked up to
    }),
  });
  const save = createSave(store);
  expect(save.stageBest('gardenPath')).toBe(60);
  save.easy = true; // any change writes the save again
  const written = JSON.parse(store.items.get('sprout.save') ?? '{}');
  expect(written).not.toHaveProperty('reached');
  expect(written.stages).toEqual({ gardenPath: { best: 60 } });
});

it('remembers how loud the music and the effects are, kept between silent and full', () => {
  const store = memoryStore();
  const first = createSave(store);
  expect([first.volume('music'), first.volume('sfx')]).toEqual([0.8, 1]); // the defaults
  first.setVolume('music', 0.4);
  first.setVolume('sfx', 3);
  const second = createSave(store);
  expect([second.volume('music'), second.volume('sfx')]).toEqual([0.4, 1]);
});

it('gives a save from before Options the default volumes, and ignores nonsense in one', () => {
  const old = createSave(memoryStore({ 'sprout.save': JSON.stringify({ v: 1, easy: true, best: {} }) }));
  expect([old.easy, old.volume('music'), old.volume('sfx')]).toEqual([true, 0.8, 1]);
  const odd = createSave(
    memoryStore({ 'sprout.save': JSON.stringify({ v: 1, volume: { music: 'loud', sfx: -2 } }) }),
  );
  expect([odd.volume('music'), odd.volume('sfx')]).toEqual([0.8, 0]);
});
