// A little mushroom hanging up in the canopy, out of reach of straight shots. It lets go under a "!", timed so
// that a Pip who keeps running arrives just as it lands; one who looks up can stop short, or shoot it down with
// a seed aimed up. On the ground it sits and hurts to touch until a seed cheers it up. It teaches watching
// overhead, as Mo's rain will need.
import { GROUND } from '../../../config';
import { Enemy, type EnemyWorld } from './enemy';

export const DROP_WARN = 0.45; // seconds of "!" before it lets go
const G = 1500,
  R = 18,
  NEAR = 40; // how close to under it Pip has to be heading

export class Dropcap extends Enemy {
  readonly kind = 'dropcap';
  state: 'hang' | 'warn' | 'fall' | 'down' = 'hang';
  timer = 0;
  private vy = 0;

  constructor(x: number, y: number) {
    super(x, y, 1);
  }

  hurtbox() {
    return { x: this.x, y: this.y, r: R };
  }
  override bloomY() {
    return this.state === 'down' ? GROUND : null;
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player,
      floor = GROUND - R;
    if (this.state === 'hang') {
      // where Pip will be when it lands, if it lets go now
      const lands = DROP_WARN + Math.sqrt((2 * (floor - this.y)) / G);
      if (p.alive && Math.abs(p.x + p.vx * lands - this.x) < NEAR) {
        this.state = 'warn';
        this.timer = DROP_WARN;
        w.emit({ type: 'enemyWarn', x: this.x, y: this.y - 34 });
      }
    } else if (this.state === 'warn') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'fall';
    } else if (this.state === 'fall') {
      this.vy += G * dt;
      this.y += this.vy * dt;
      if (this.y >= floor) {
        this.y = floor;
        this.state = 'down';
        w.emit({ type: 'thud', x: this.x, y: GROUND });
      }
    }
  }
}
