import { expect, it } from 'vitest';
import { readPad, type PadLike } from '../src/gamepad';

const pad = (pressed: number[] = [], axes: number[] = [0, 0]): PadLike => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
});

it('reads nothing from a missing gamepad', () => {
  expect(Object.values(readPad(null)).some(Boolean)).toBe(false);
});

it('moves with the stick or the d-pad', () => {
  expect(readPad(pad([], [-0.9, 0])).left).toBe(true);
  expect(readPad(pad([], [0.9, 0])).right).toBe(true);
  expect(readPad(pad([14])).left).toBe(true);
  expect(readPad(pad([15])).right).toBe(true);
});

it('ignores a stick that is only resting off-centre', () => {
  const state = readPad(pad([], [0.2, -0.2]));
  expect([state.left, state.right, state.up, state.down]).toEqual([false, false, false, false]);
});

it('reads down from the stick or the d-pad, for moving through the pause card', () => {
  expect(readPad(pad([], [0, 0.9])).down).toBe(true);
  expect(readPad(pad([13])).down).toBe(true);
  expect(readPad(pad([12])).down).toBe(false);
});

it('aims up, jumps, shoots and pauses', () => {
  expect(readPad(pad([], [0, -0.9])).up).toBe(true);
  expect(readPad(pad([12])).up).toBe(true);
  expect(readPad(pad([0])).jump).toBe(true);
  for (const button of [2, 5, 7]) expect(readPad(pad([button])).shoot).toBe(true);
  expect(readPad(pad([9])).start).toBe(true);
});

it('copes with a pad that has fewer buttons than the standard layout', () => {
  expect(readPad({ buttons: [{ pressed: true }], axes: [] })).toMatchObject({
    jump: true,
    start: false,
    left: false,
  });
});
