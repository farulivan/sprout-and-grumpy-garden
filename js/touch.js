// On-screen controls for tablets/phones (kids play on these a lot).
// On touch: Pip auto-fires, the left pad moves, Jump is hold-for-higher, and the aim button toggles
// shooting diagonally up (at Sunny's face). Controls are shown by CSS only while state === 'play'.
import { input } from './input.js';

const RELEASE = ['pointerup', 'pointercancel', 'lostpointercapture'];
// Capture keeps the button pressed if the finger slides off it. It can throw if the pointer is already gone.
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch { /* not capturable: fine */ } };

export function initTouch(onPress = () => {}) {
  const enable = () => {
    if (input.touch) return;
    input.touch = input.autoFire = true;
    document.body.classList.add('touch');
  };
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', enable, { passive: true });

  // Move pad: one element; the half under each finger picks the direction, so a thumb can slide across.
  const pad = document.getElementById('t-move'), fingers = new Map();
  const syncPad = () => {
    const rect = pad.getBoundingClientRect(), mid = rect.left + rect.width / 2;
    let l = false, r = false;
    for (const x of fingers.values()) { if (x < mid) l = true; else r = true; }
    input.left = l; input.right = r;
    pad.classList.toggle('l', l); pad.classList.toggle('r', r);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault(); capture(pad, e); fingers.set(e.pointerId, e.clientX); syncPad(); onPress();
  });
  pad.addEventListener('pointermove', (e) => { if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, e.clientX); syncPad(); } });
  for (const t of RELEASE) pad.addEventListener(t, (e) => { if (fingers.delete(e.pointerId)) syncPad(); });

  const jump = document.getElementById('t-jump');
  jump.addEventListener('pointerdown', (e) => {
    e.preventDefault(); capture(jump, e);
    if (!input.jump) input.just.add('jump');
    input.jump = true; jump.classList.add('on'); onPress();
  });
  for (const t of RELEASE) jump.addEventListener(t, () => { input.jump = false; jump.classList.remove('on'); });

  const aim = document.getElementById('t-aim');
  aim.addEventListener('pointerdown', (e) => {
    e.preventDefault(); input.aimLock = !input.aimLock; aim.classList.toggle('on', input.aimLock); onPress();
  });
}
