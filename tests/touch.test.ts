// What a finger presses on the touch screen's buttons (src/ui/touch.ts): the button it is on, a little past
// its edge, both action buttons from the gap between them, and on the move buttons, the side it is on.
import { describe, expect, it } from 'vitest';
import { directionAt, pressedAt, type Disc } from '../src/ui/touch';

// As laid out on screen: the big Shoot button, and Jump up and to its right with a gap between them.
const shoot: Disc = { act: 'shoot', x: 100, y: 200, r: 58 };
const jump: Disc = { act: 'jump', x: 196, y: 128, r: 40 };
const actions = [shoot, jump];

describe('the action buttons', () => {
  it('press the button a finger is on, or just past its edge', () => {
    expect(pressedAt(actions, 100, 200)).toEqual(['shoot']);
    expect(pressedAt(actions, 196, 128)).toEqual(['jump']);
    expect(pressedAt(actions, 100 - 62, 200)).toEqual(['shoot']); // 4 px off its edge
    expect(pressedAt(actions, 196 + 44, 128)).toEqual(['jump']);
  });

  it('press both from the gap between them, so one thumb can jump while it shoots', () => {
    // halfway along the line between their centres, in the gap between their edges
    expect(pressedAt(actions, 148, 164)).toEqual(['shoot', 'jump']);
  });

  it('press nothing away from them, even beside the gap', () => {
    expect(pressedAt(actions, 100 - 80, 200)).toEqual([]);
    expect(pressedAt(actions, 230, 230)).toEqual([]); // beside the gap, outside the pill joining them
    expect(pressedAt(actions, 60, 80)).toEqual([]);
  });
});

describe('the move buttons', () => {
  const left: Disc = { act: 'left', x: 60, y: 300, r: 42 },
    right: Disc = { act: 'right', x: 156, y: 300, r: 42 };
  it('point the way of the side a finger is on, with no spot between them that does nothing', () => {
    expect(directionAt(left, right, 20)).toBe('left');
    expect(directionAt(left, right, 107)).toBe('left');
    expect(directionAt(left, right, 108)).toBe('right');
    expect(directionAt(left, right, 400)).toBe('right');
  });
});
