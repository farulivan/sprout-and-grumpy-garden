// Keyboard input. Booleans for held keys + a per-frame "just pressed" set.
const MAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ' ': 'jump', z: 'jump', Z: 'jump', k: 'jump', K: 'jump',
  x: 'shoot', X: 'shoot', j: 'shoot', J: 'shoot', l: 'shoot', L: 'shoot',
  Enter: 'start',
  p: 'pause', P: 'pause', Escape: 'pause',
  m: 'mute', M: 'mute',
};
const ACTIONS = ['left', 'right', 'up', 'jump', 'shoot', 'start', 'pause', 'mute'];

export const input = {
  left: false, right: false, up: false, jump: false, shoot: false, start: false, pause: false, mute: false,
  touch: false, autoFire: false, aimLock: false, // set by touch controls
  just: new Set(),
  pressed(name) { return this.just.has(name); },
  endFrame() { this.just.clear(); },
};

export function initInput(onAnyKey) {
  window.addEventListener('keydown', (e) => {
    const name = MAP[e.key];
    if (name) {
      e.preventDefault();
      if (!input[name]) input.just.add(name);
      input[name] = true;
    }
    if (onAnyKey) onAnyKey();
  });
  window.addEventListener('keyup', (e) => { const name = MAP[e.key]; if (name) input[name] = false; });
  window.addEventListener('blur', () => { for (const a of ACTIONS) input[a] = false; });
}
