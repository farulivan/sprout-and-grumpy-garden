// The keyboard (src/controls.ts): several keys at once, two keys for one action, and turning round.
import { beforeEach, expect, it, vi } from 'vitest';
import { Controls } from '../src/controls';

vi.stubGlobal('window', { addEventListener: () => {} }); // the tests press keys themselves

const CODES: Record<string, string> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ' ': 'Space',
  x: 'KeyX',
  X: 'KeyX',
  d: 'KeyD',
  Backspace: 'Backspace',
};
let c: Controls;
const down = (key: string) => c.keyDown({ key, code: CODES[key] });
const up = (key: string) => c.keyUp({ key, code: CODES[key] });
beforeEach(() => (c = new Controls()));

it('takes four keys at once: run, aim up, shoot and jump', () => {
  for (const key of ['ArrowRight', 'ArrowUp', 'x', ' ']) down(key);
  expect(c.frame()).toEqual({
    left: false,
    right: true,
    up: true,
    jump: true,
    shoot: true,
    jumpPressed: true,
  });
});

it('keeps an action that another key still holds when one key is let go', () => {
  down('ArrowRight');
  down('d'); // D moves right too
  up('d');
  expect(c.frame().right).toBe(true);
  up('ArrowRight');
  expect(c.frame().right).toBe(false);
});

it('lets go of a key even if Shift changed what it types while it was held', () => {
  down('x');
  up('X');
  expect(c.frame().shoot).toBe(false);
});

it('goes the way pressed last when ← and → are both held, and back when that one is let go', () => {
  down('ArrowRight');
  down('ArrowLeft'); // turning round before letting go of →
  expect(c.frame()).toMatchObject({ left: true, right: false });
  up('ArrowLeft');
  expect(c.frame()).toMatchObject({ left: false, right: true });
  down('ArrowLeft');
  up('ArrowRight');
  expect(c.frame()).toMatchObject({ left: true, right: false });
});

it('goes back with Backspace, once per press', () => {
  down('Backspace');
  expect(c.pressed('back')).toBe(true);
  c.endFrame();
  expect(c.pressed('back')).toBe(false);
});
