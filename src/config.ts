// World constants shared by the simulation and everything that draws it. Units are logical pixels.
export const W = 960;
export const H = 540;
export const GROUND = 468;
// Pip can't walk past this x: stops the player camping behind the boss's stem.
export const ARENA_R = 720;
export const TAU = Math.PI * 2;
// The simulation always advances by exactly this many seconds per step.
export const STEP = 1 / 60;
