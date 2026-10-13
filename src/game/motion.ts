// Small helpers the views and effects share for moving things about. The randomness here is only ever
// cosmetic (which way a puff of dust drifts); the simulation has its own seeded stream.
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
// Shoots a little past its goal and settles back: for things that pop in. u runs from 0 to 1.
export const easeOutBack = (u: number) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
