// Player input. Keyboard, gamepad and on-screen touch buttons all end up as the same held actions, plus
// a set of actions that were pressed since they were last looked at.
import { PAD_ACTIONS, readPad } from './gamepad';
import type { InputFrame } from './sim/input';

// Down only moves between a card's buttons (see App.tick): Pip has no use for it.
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'start' | 'pause' | 'mute';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'jump', z: 'jump', Z: 'jump', k: 'jump', K: 'jump',
  x: 'shoot', X: 'shoot', j: 'shoot', J: 'shoot', l: 'shoot', L: 'shoot',
  Enter: 'start',
  p: 'pause', P: 'pause', Escape: 'pause',
  m: 'mute', M: 'mute',
}; // prettier-ignore

// A button or checkbox on the card that is showing. When the player has tabbed to one, Space presses or
// ticks it, as on any web page, instead of making Pip jump (which on the title card starts the game). A
// player who clicked can't see where the focus is, so for them Space still starts the game.
const onCard = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  target.matches('button, input') &&
  !!target.closest('#overlay:not(.hidden) .card:not(.hidden)');

export class Controls {
  readonly held: Record<Action, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false,
    start: false,
    pause: false,
    mute: false,
  };
  // Set by the touch controls: Pip fires by himself, and the aim button is a toggle.
  touch = false;
  autoFire = false;
  aimLock = false;
  private just = new Set<Action>();
  private pad = readPad(null);
  private tabbed = false; // the focus was moved with Tab since the last click or touch

  constructor(onAnyKey: () => void = () => {}) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') this.tabbed = true;
      const action = KEYS[e.key];
      if (action && !(e.key === ' ' && this.tabbed && onCard(e.target))) {
        e.preventDefault();
        this.press(action);
      }
      onAnyKey();
    });
    window.addEventListener('pointerdown', () => (this.tabbed = false));
    window.addEventListener('keyup', (e) => {
      const action = KEYS[e.key];
      if (action) this.release(action);
    });
    window.addEventListener('blur', () => {
      for (const a of Object.keys(this.held) as Action[]) this.held[a] = false;
    });
    // lets the title card show a gamepad's buttons instead of keys, to players who have one
    window.addEventListener('gamepadconnected', () => document.body.classList.add('gamepad'));
  }

  // Gamepads have no events for buttons: call this once per display frame to read them.
  poll() {
    const pads = navigator.getGamepads?.() ?? [];
    const next = readPad([...pads].find((p) => p?.connected));
    for (const action of PAD_ACTIONS) {
      if (!next[action] || this.pad[action]) continue;
      this.just.add(action);
      if (action === 'start') this.just.add('pause'); // Start both begins a fight and pauses one
    }
    this.pad = next;
  }

  press(action: Action) {
    if (!this.held[action]) this.just.add(action);
    this.held[action] = true;
  }
  release(action: Action) {
    this.held[action] = false;
  }
  // True once per press.
  pressed(action: Action) {
    return this.just.has(action);
  }

  // What the simulation gets for one step.
  frame(): InputFrame {
    const h = this.held,
      pad = this.pad;
    return {
      left: h.left || pad.left,
      right: h.right || pad.right,
      up: h.up || pad.up || this.aimLock,
      jump: h.jump || pad.jump,
      shoot: h.shoot || pad.shoot || this.autoFire,
      jumpPressed: this.just.has('jump'),
    };
  }
  // A jump press belongs to exactly one simulation step.
  consumeJump() {
    this.just.delete('jump');
  }
  // Call at the end of every display frame. keepJump holds a jump press over for a frame in which the
  // simulation did not step (displays faster than 60 Hz), so the press is not lost.
  endFrame(keepJump = false) {
    const jump = keepJump && this.just.has('jump');
    this.just.clear();
    if (jump) this.just.add('jump');
  }
}
