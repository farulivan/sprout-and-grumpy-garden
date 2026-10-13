// World constants shared by the simulation and everything that draws it. Units are logical pixels.
export const W = 960;
export const H = 540;
export const GROUND = 468;
// Pip can't walk past this x: stops the player camping behind the boss's stem.
export const ARENA_R = 720;
export const TAU = Math.PI * 2;
export const UP = -Math.PI / 2; // straight up, as an angle (y grows downward)
// The simulation always advances by exactly this many seconds per step.
export const STEP = 1 / 60;
// Phaser renders at RES times the logical size (1920x1080) so the art stays sharp on tablets and retina
// screens. Gameplay never sees this: cameras zoom by RES, and baked textures are drawn RES times larger.
export const RES = 2;
