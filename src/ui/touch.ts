// On-screen controls for tablets/phones (kids play on these a lot).
// On touch: Pip auto-fires, the left pad moves, Jump is hold-for-higher, and the aim button toggles
// shooting diagonally up (at Sunny's face). CSS shows the controls only while the stage state is "play".
import type { Controls } from '../controls';

const RELEASE = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;
// Capture keeps the button pressed if the finger slides off it. It can throw if the pointer is already gone.
const capture = (el: HTMLElement, e: PointerEvent) => {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* not capturable: fine */
  }
};
const byId = (id: string) => document.getElementById(id) as HTMLElement;

export function initTouch(controls: Controls, onPress: () => void = () => {}) {
  const enable = () => {
    if (controls.touch) return;
    controls.touch = controls.autoFire = true;
    document.body.classList.add('touch');
  };
  if (window.matchMedia?.('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', enable, { passive: true });

  // Move pad: one element; the half under each finger picks the direction, so a thumb can slide across.
  const pad = byId('t-move');
  const fingers = new Map<number, number>();
  const syncPad = () => {
    const rect = pad.getBoundingClientRect(),
      mid = rect.left + rect.width / 2;
    let l = false,
      r = false;
    for (const x of fingers.values()) {
      if (x < mid) l = true;
      else r = true;
    }
    controls.held.left = l;
    controls.held.right = r;
    pad.classList.toggle('l', l);
    pad.classList.toggle('r', r);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(pad, e);
    fingers.set(e.pointerId, e.clientX);
    syncPad();
    onPress();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, e.clientX);
    syncPad();
  });
  for (const t of RELEASE)
    pad.addEventListener(t, (e) => {
      if (fingers.delete(e.pointerId)) syncPad();
    });

  const jump = byId('t-jump');
  jump.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(jump, e);
    controls.press('jump');
    jump.classList.add('on');
    onPress();
  });
  for (const t of RELEASE)
    jump.addEventListener(t, () => {
      controls.release('jump');
      jump.classList.remove('on');
    });

  const aim = byId('t-aim');
  aim.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    controls.aimLock = !controls.aimLock;
    aim.classList.toggle('on', controls.aimLock);
    onPress();
  });
}
