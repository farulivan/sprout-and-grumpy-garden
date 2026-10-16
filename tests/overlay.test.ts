// Moving between a card's buttons with the arrow keys or a d-pad (nearest() in src/ui/overlay.ts).
import { expect, it } from 'vitest';
import { nearest, type Box } from '../src/ui/overlay';

const box = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});
// The pause card as the browser lays it out: "Keep playing", with "Start over" and "Title screen" side by
// side under it. The row is a little wider on the right, so its middle is not under "Keep playing".
const KEEP = 0,
  OVER = 1,
  TITLE = 2;
const pauseCard = [box(390, 274, 210, 52), box(325, 344, 154, 42), box(497, 344, 168, 42)];
const go = (from: number, dx: number, dy: number) => nearest(pauseCard, from, dx, dy);

it('goes down to the first button of the row underneath, and back up from either', () => {
  expect(go(KEEP, 0, 1)).toBe(OVER);
  expect(go(OVER, 0, -1)).toBe(KEEP);
  expect(go(TITLE, 0, -1)).toBe(KEEP);
});

it('goes along a row', () => {
  expect(go(OVER, 1, 0)).toBe(TITLE);
  expect(go(TITLE, -1, 0)).toBe(OVER);
});

it('stays put when no button lies wholly that way', () => {
  expect(go(KEEP, 0, -1)).toBe(KEEP);
  expect(go(KEEP, 1, 0)).toBe(KEEP); // "Title screen" is lower right, not to the right
  expect(go(OVER, 0, 1)).toBe(OVER);
  expect(go(TITLE, 1, 0)).toBe(TITLE);
});

it('prefers a button straight ahead to a nearer one off to the side', () => {
  const column = [box(0, 0, 100, 40), box(0, 110, 100, 40), box(140, 50, 100, 40)];
  expect(nearest(column, 0, 0, 1)).toBe(1); // 70 below, against 10 below and 40 to the side
});
