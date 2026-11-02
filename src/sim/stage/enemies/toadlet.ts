// A squat toadstool that hops at Pip in high arcs. In the air it clears straight shots and he can run under
// it; each landing it sits for a moment, when a seed can reach it. It hops across pits, too far for it to
// come down in one. Once Pip is past it stays behind him, unless he is shut in a glade with it. It teaches
// passing under a hop, as Mo's Big Hop will need.
import { GROUND } from '../../../config';
import { clamp } from '../../math';
import { solidAt, supportAt } from '../terrain';
import { Enemy, type EnemyWorld } from './enemy';

export const HOP_T = 0.8; // seconds in the air, and so about 104 px high at the top
const HOP_V = 520,
  G = (2 * HOP_V) / HOP_T,
  SIT = 0.3, // seconds on the ground between hops, crouching for the next
  RANGE = 220, // the farthest it hops, as a rule...
  OVER_A_PIT = 340, // ...and when that would drop it in a pit
  SIGHT = 620, // how close across Pip comes before it stirs
  SNAP = 12,
  R = 18;

export class Toadlet extends Enemy {
  readonly kind = 'toadlet';
  state: 'sit' | 'hop' = 'sit';
  timer = SIT;
  landX = 0; // where this hop comes down
  private vx = 0;
  private vy = 0;
  private readonly floor: number;

  constructor(x: number, y: number) {
    super(x, y, 2);
    this.floor = y;
  }

  hurtbox() {
    return { x: this.x, y: this.y - R, r: R };
  }
  override bloomY() {
    return this.state === 'sit' ? this.y : null;
  }

  protected act(dt: number, w: EnemyWorld) {
    if (this.state === 'sit') {
      this.timer -= dt;
      if (this.timer <= 0) this.takeOff(w);
      return;
    }
    this.vy += G * dt;
    const x = this.x + this.vx * dt;
    if (!solidAt(w.solids, x, this.y - R)) this.x = clamp(x, w.minX, w.maxX);
    this.y += this.vy * dt;
    if (this.y < this.floor) return;
    // it was aimed at this spot, so it comes down on it (a step's rounding must not put it over an edge)
    if (Math.abs(this.x - this.landX) < SNAP) this.x = this.landX;
    if (supportAt(w, this.x, this.floor)) {
      this.y = this.floor;
      this.state = 'sit';
      this.timer = SIT;
    } else if (this.y > GROUND + 120) this.dead = true; // a wall stopped it over a pit: gone, cheered or not
  }

  private takeOff(w: EnemyWorld) {
    const p = w.player,
      dx = p.x - this.x,
      seen = p.alive && Math.abs(dx) < SIGHT && (w.closed || dx * this.facing > 0);
    if (!seen) {
      this.timer = SIT;
      return;
    }
    if (w.closed) this.facing = dx < 0 ? -1 : 1;
    const can = (x: number) =>
      x > w.minX + R &&
      x < w.maxX - R &&
      supportAt(w, x, this.floor) &&
      !solidAt(w.solids, x, this.floor - R);
    const near = this.x + clamp(dx, -RANGE, RANGE);
    let to = near;
    // the spot it wants, or the first spot to stand on beyond it, or else the nearest one short of it
    if (!can(to))
      for (let d = 20; d <= OVER_A_PIT; d += 20) {
        const far = near + this.facing * d;
        if (Math.abs(far - this.x) <= OVER_A_PIT && can(far)) {
          to = far;
          break;
        }
        const short = near - this.facing * d;
        if ((short - this.x) * this.facing > 0 && can(short)) {
          to = short;
          break;
        }
      }
    if (!can(to)) {
      this.timer = SIT; // nowhere to go
      return;
    }
    this.landX = to;
    this.vx = (to - this.x) / HOP_T;
    this.vy = -HOP_V;
    this.state = 'hop';
  }
}
