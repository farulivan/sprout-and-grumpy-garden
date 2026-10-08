// Player input. Keyboard and on-screen touch buttons all end up as the same held actions, plus a set of
// actions that were pressed since they were last looked at.
import type { InputFrame } from './sim/input';

export type Action = 'left' | 'right' | 'up' | 'jump' | 'shoot' | 'start' | 'pause' | 'mute';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ' ': 'jump', z: 'jump', Z: 'jump', k: 'jump', K: 'jump',
  x: 'shoot', X: 'shoot', j: 'shoot', J: 'shoot', l: 'shoot', L: 'shoot',
  Enter: 'start',
  p: 'pause', P: 'pause', Escape: 'pause',
  m: 'mute', M: 'mute',
}; // prettier-ignore

export class Controls {
  readonly held: Record<Action, boolean> = {
    left: false,
    right: false,
    up: false,
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

  constructor(onAnyKey: () => void = () => {}) {
    window.addEventListener('keydown', (e) => {
      const action = KEYS[e.key];
      if (action) {
        e.preventDefault();
        this.press(action);
      }
      onAnyKey();
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYS[e.key];
      if (action) this.release(action);
    });
    window.addEventListener('blur', () => {
      for (const a of Object.keys(this.held) as Action[]) this.held[a] = false;
    });
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
    const h = this.held;
    return {
      left: h.left,
      right: h.right,
      up: h.up || this.aimLock,
      jump: h.jump,
      shoot: h.shoot || this.autoFire,
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
