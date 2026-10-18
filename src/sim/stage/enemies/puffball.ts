// A dandelion clock in a huff. It drifts toward Pip and sinks to hang just in front of him, above his head:
// clear of him while he stands, right in the way when he jumps forward. It hangs where a seed aimed up passes
// and a straight one can't reach, so it teaches aiming up, the same shot that reaches Sunny's face.
import { GROUND } from '../../../config';
import { clamp } from '../../math';
import { Enemy, type EnemyWorld } from './enemy';

const DRIFT = 46, // px/s, across toward Pip
  SINK = 26, // px/s, down toward him once it is close
  CLOSE = 170, // how near across before it sinks
  HOVER = GROUND - 74, // how low it comes: over a standing Pip's head, in the path of a jump
  AHEAD = 60; // how far in front of Pip it hangs: where his seeds aimed up cross that height

export class Puffball extends Enemy {
  readonly kind = 'puffball';
  private float: number; // its height before the bob

  constructor(
    x: number,
    private readonly home: number, // the height it floats at until Pip is close
  ) {
    super(x, home, 1);
    this.float = home;
  }

  hurtbox() {
    return { x: this.x, y: this.y, r: 17 };
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player,
      dx = p.x + p.facing * AHEAD - this.x;
    this.facing = p.x < this.x ? -1 : 1;
    this.x += clamp(dx, -DRIFT * dt, DRIFT * dt);
    const goal = Math.abs(p.x - this.x) < CLOSE ? HOVER : this.home;
    this.float += clamp(goal - this.float, -SINK * dt, SINK * dt);
    this.y = this.float + Math.sin(this.t * 2.4) * 9;
  }
}
