// Reads a gamepad with the standard layout (Xbox, PlayStation, Switch Pro and most others) into the
// game's actions: stick or d-pad to move, up to aim, A to jump, X or a right shoulder button to shoot,
// Start to pause. On the pause card, the stick or d-pad moves between the buttons and A presses one.
export interface PadLike {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}
export type PadAction = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'start';
export type PadState = Record<PadAction, boolean>;
export const PAD_ACTIONS: readonly PadAction[] = ['left', 'right', 'up', 'down', 'jump', 'shoot', 'start'];

const A = 0,
  X = 2,
  RIGHT_BUMPER = 5,
  RIGHT_TRIGGER = 7,
  START = 9,
  DPAD_UP = 12,
  DPAD_DOWN = 13,
  DPAD_LEFT = 14,
  DPAD_RIGHT = 15;
const STICK = 0.4; // how far the stick must tilt before it counts

export function readPad(pad: PadLike | null | undefined): PadState {
  const pressed = (i: number) => !!pad?.buttons[i]?.pressed;
  const x = pad?.axes[0] ?? 0,
    y = pad?.axes[1] ?? 0;
  return {
    left: pressed(DPAD_LEFT) || x < -STICK,
    right: pressed(DPAD_RIGHT) || x > STICK,
    up: pressed(DPAD_UP) || y < -STICK,
    down: pressed(DPAD_DOWN) || y > STICK,
    jump: pressed(A),
    shoot: pressed(X) || pressed(RIGHT_TRIGGER) || pressed(RIGHT_BUMPER),
    start: pressed(START),
  };
}
