import { GROUND } from '../config';

// Heals one heart. Dropped from the sky at each boss phase change.
export class Dewdrop {
  px: number;
  py: number;
  vy = 0;
  readonly r = 14;
  t = 0;
  life = 10;
  dead = false;
  constructor(
    public x: number,
    public y: number,
  ) {
    this.px = x;
    this.py = y;
  }

  update(dt: number) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    this.vy += 500 * dt;
    this.y += this.vy * dt;
    if (this.y > GROUND - 14) {
      this.y = GROUND - 14;
      this.vy = 0;
    }
  }
}

// Placed along a stage: a dewdrop (heals one heart) or a golden seed (every third one heals a heart). It
// floats where it was put and never goes away until Pip takes it.
export class Placed {
  readonly r = 14;
  dead = false;
  constructor(
    readonly kind: 'dew' | 'seed',
    readonly x: number,
    readonly y: number,
  ) {}
  get px() {
    return this.x;
  }
  get py() {
    return this.y;
  }
}
