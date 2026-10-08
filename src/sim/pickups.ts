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
