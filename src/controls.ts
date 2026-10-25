// Player input. Keyboard, gamepad and on-screen touch buttons all end up as the same held actions, plus
// a set of actions that were pressed since they were last looked at.
import { PAD_ACTIONS, readPad } from './gamepad';
import type { InputFrame } from './sim/input';

// Down only moves between a card's buttons (see App.tick): Pip has no use for it, nor for back, which leaves
// a menu's page.
export type Action =
  'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'start' | 'pause' | 'mute' | 'back';

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
  Backspace: 'back',
}; // prettier-ignore
// Keys that are never "any key" on the title: they only change what another key does, or move the focus.
const NOT_ANY = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock']);

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
    back: false,
  };
  touch = false; // a touch screen is in use (src/ui/touch.ts): its buttons show, and the hints name them
  private just = new Set<Action>();
  // The keys held down, by where they are on the keyboard (code), and what each does. Several keys share an
  // action (→ and D both move right), so an action is let go only when the last key holding it is.
  private keys = new Map<string, Action>();
  private lastDir: 'left' | 'right' = 'right'; // with ← and → both held, the one pressed last wins
  private pad = readPad(null);
  private tabbed = false; // the focus was moved with Tab since the last click or touch
  private any = false; // any key, click, tap or gamepad button since the end of the last frame
  private padButtons: boolean[] = [];

  constructor(onAnyKey: () => void = () => {}) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') this.tabbed = true;
      if (KEYS[e.key] && !(e.key === ' ' && this.tabbed && onCard(e.target))) {
        e.preventDefault();
        this.keyDown(e);
      }
      if (!NOT_ANY.has(e.key) && !e.repeat) this.any = true;
      onAnyKey();
    });
    window.addEventListener('pointerdown', () => {
      this.tabbed = false;
      this.any = true;
    });
    window.addEventListener('keyup', (e) => this.keyUp(e));
    window.addEventListener('blur', () => {
      this.keys.clear();
      for (const a of Object.keys(this.held) as Action[]) this.held[a] = false;
    });
    // lets the title card show a gamepad's buttons instead of keys, to players who have one
    window.addEventListener('gamepadconnected', () => document.body.classList.add('gamepad'));
  }

  // Gamepads have no events for buttons: call this once per display frame to read them.
  poll() {
    const pads = navigator.getGamepads?.() ?? [],
      pad = [...pads].find((p) => p?.connected);
    const next = readPad(pad);
    const buttons = pad ? pad.buttons.map((b) => b.pressed) : [];
    if (buttons.some((down, i) => down && !this.padButtons[i])) this.any = true;
    this.padButtons = buttons;
    for (const action of PAD_ACTIONS) {
      if (!next[action] || this.pad[action]) continue;
      this.just.add(action);
      if (action === 'start') this.just.add('pause'); // Start both begins a fight and pauses one
    }
    this.pad = next;
  }

  keyDown(e: Pick<KeyboardEvent, 'key' | 'code'>) {
    const action = KEYS[e.key];
    if (!action) return;
    this.keys.set(e.code || e.key, action);
    this.press(action);
  }
  // A key is known by its place, not by what it types, which Shift can change while it is held.
  keyUp(e: Pick<KeyboardEvent, 'key' | 'code'>) {
    const id = e.code || e.key,
      action = this.keys.get(id) ?? KEYS[e.key];
    this.keys.delete(id);
    if (action && ![...this.keys.values()].includes(action)) this.release(action);
  }

  press(action: Action) {
    if (!this.held[action]) this.just.add(action);
    this.held[action] = true;
    if (action === 'left' || action === 'right') this.lastDir = action;
  }
  release(action: Action) {
    this.held[action] = false;
  }
  // True once per press.
  pressed(action: Action) {
    return this.just.has(action);
  }
  // Any key, click, tap or gamepad button this frame: "Press any key" on the title.
  anyPressed() {
    return this.any;
  }

  // What the simulation gets for one step.
  frame(): InputFrame {
    const h = this.held,
      pad = this.pad;
    let left = h.left || pad.left,
      right = h.right || pad.right;
    // Both held, as when a keyboard player turns round before letting go of the other key: the one pressed
    // last wins, instead of the two cancelling out and Pip stopping dead.
    if (left && right) [left, right] = [this.lastDir === 'left', this.lastDir === 'right'];
    return {
      left,
      right,
      up: h.up || pad.up,
      jump: h.jump || pad.jump,
      shoot: h.shoot || pad.shoot,
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
    this.any = false;
    if (jump) this.just.add('jump');
  }
}
