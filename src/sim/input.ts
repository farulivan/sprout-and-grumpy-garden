// What the player is asking for during one simulation step.
export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean; // aim diagonally up
  jump: boolean; // held: keeps the jump rising
  shoot: boolean;
  jumpPressed: boolean; // true only on the step the jump button went down
}

export const NO_INPUT: InputFrame = {
  left: false,
  right: false,
  up: false,
  jump: false,
  shoot: false,
  jumpPressed: false,
};
