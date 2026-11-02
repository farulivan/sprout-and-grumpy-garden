// A cheered-up plant that throws Pip into the air when he falls onto it. On a stage it stays for good; a boss
// fight's wilt after a while (life).
export const BOUNCER_TOP = 36; // how far above its foot Pip comes down on it
const HALF = 34; // how far to each side of its middle he can land

export class Bouncer {
  dead = false;
  t = 0;
  sprung = 0; // 1 -> 0 after Pip bounces on it; only drives how it is drawn

  constructor(
    readonly x: number,
    readonly y: number, // its foot
    private life = Infinity,
  ) {}

  get top() {
    return this.y - BOUNCER_TOP;
  }

  // Whether feet going from prevY down to y, at x, come down on it.
  catches(x: number, prevY: number, y: number) {
    return Math.abs(x - this.x) < HALF && prevY <= this.top + 0.01 && y >= this.top;
  }

  update(dt: number) {
    this.t += dt;
    this.sprung = Math.max(0, this.sprung - dt * 3);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
