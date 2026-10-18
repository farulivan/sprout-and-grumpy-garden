// On-screen controls for tablets and phones (kids play on these a lot): ◀ and ▶ at the bottom left, and
// at the bottom right a big Shoot button, held to fire like X on a keyboard, with a smaller Jump up and to
// its right, held for a higher jump. There is no aiming on a touch screen: seeds fly straight, and Sunny's
// face is reached from the high leaf. CSS shows the controls only while the stage state is "play".
//
// Each side is one touch area, and where each finger is decides what it presses, so a thumb can slide
// from one button to the next without lifting, and a second finger works too.
import type { Action, Controls } from '../controls';

export type TouchAction = Extract<Action, 'left' | 'right' | 'jump' | 'shoot'>;
// A round button where it is on the page: its centre and radius, in client pixels.
export interface Disc {
  act: TouchAction;
  x: number;
  y: number;
  r: number;
}

const SLACK = 1.15; // a finger just off a button's edge still presses it

// What a finger at (x, y) presses among the action buttons: the one it is on; in the gap between two of
// them (inside the pill shape that joins them), both, so one thumb resting between Shoot and Jump jumps
// while it shoots; and otherwise any it is just off the edge of.
export function pressedAt(discs: readonly Disc[], x: number, y: number): TouchAction[] {
  const within = (k: number) =>
    discs.filter((d) => Math.hypot(x - d.x, y - d.y) <= d.r * k).map((d) => d.act);
  const on = within(1);
  if (on.length) return on;
  if (discs.length === 2 && inPill(discs[0], discs[1], x, y)) return [discs[0].act, discs[1].act];
  return within(SLACK);
}

// Whether (x, y) is inside the shape a rubber band would make around two discs.
function inPill(a: Disc, b: Disc, x: number, y: number) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy);
  return t > 0 && t < 1 && Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)) <= a.r + (b.r - a.r) * t;
}

// Which way a finger on the move buttons points: the side of the midpoint between ◀ and ▶ it is on, so
// there is no spot between them that does nothing.
export function directionAt(left: Disc, right: Disc, x: number): TouchAction {
  return x < (left.x + right.x) / 2 ? 'left' : 'right';
}

const RELEASE = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;
// Capture keeps a finger working if it slides off its area. It can throw if the pointer is already gone.
const capture = (el: HTMLElement, e: PointerEvent) => {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* not capturable: fine */
  }
};
const byId = (id: string) => document.getElementById(id) as HTMLElement;

// One side's touch area and its buttons. pressed: what a finger at (x, y) presses, given where the
// buttons are.
function touchArea(
  area: HTMLElement,
  controls: Controls,
  pressed: (discs: Disc[], x: number, y: number) => TouchAction[],
  onPress: () => void,
) {
  const buttons = [...area.querySelectorAll<HTMLElement>('[data-act]')].map((el) => ({
    el,
    act: el.dataset.act as TouchAction,
  }));
  const fingers = new Map<number, { x: number; y: number }>();
  let held = new Set<TouchAction>();
  // From the layout, not the drawn box: a pressed button shrinks a little, and a finger on its edge must
  // not let go of it because of that.
  const discs = (): Disc[] => {
    const box = area.getBoundingClientRect();
    return buttons.map(({ el, act }) => ({
      act,
      x: box.left + el.offsetLeft + el.offsetWidth / 2,
      y: box.top + el.offsetTop + el.offsetHeight / 2,
      r: el.offsetWidth / 2,
    }));
  };
  const sync = () => {
    const where = discs(),
      now = new Set<TouchAction>();
    for (const { x, y } of fingers.values()) for (const act of pressed(where, x, y)) now.add(act);
    for (const act of now) if (!held.has(act)) controls.press(act);
    for (const act of held) if (!now.has(act)) controls.release(act);
    held = now;
    for (const { el, act } of buttons) el.classList.toggle('on', now.has(act));
  };
  area.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(area, e);
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    sync();
    onPress();
  });
  area.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    sync();
  });
  for (const t of RELEASE)
    area.addEventListener(t, (e) => {
      if (fingers.delete(e.pointerId)) sync();
    });
}

export function initTouch(controls: Controls, onPress: () => void = () => {}) {
  const enable = () => {
    if (controls.touch) return;
    controls.touch = true;
    document.body.classList.add('touch');
  };
  if (window.matchMedia?.('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', enable, { passive: true });

  const find = (discs: Disc[], act: TouchAction) => discs.find((d) => d.act === act) as Disc;
  touchArea(
    byId('t-move'),
    controls,
    (discs, x) => [directionAt(find(discs, 'left'), find(discs, 'right'), x)],
    onPress,
  );
  touchArea(byId('t-act'), controls, pressedAt, onPress);
}
