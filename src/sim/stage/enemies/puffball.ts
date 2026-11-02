// A dandelion clock in a huff. It drifts after Pip and sinks to his height, too slowly to catch him while he
// keeps moving, and if it reaches him it costs him a heart and bursts: it is gone either way, like a thrown pea,
// even if he is still flashing from a hit. A seed aimed up stops it while it is high, the same shot that reaches
// Sunny's face, and a straight one stops it as it comes down.
import { clamp } from '../../math';
import { Enemy, type EnemyWorld } from './enemy';

const DRIFT = 80, // px/s, across toward Pip
  SINK = 70, // px/s, down toward him once it is close
  CLOSE = 260, // how near across before it sinks
  CHEST = 22; // how far above his feet it aims: the middle of the circle that gets hit

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
  override get spentOnTouch() {
    return true;
  }
  override bloomY() {
    return null; // its seeds just float away
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player,
      dx = p.x - this.x;
    this.facing = dx < 0 ? -1 : 1;
    this.x += clamp(dx, -DRIFT * dt, DRIFT * dt);
    const goal = Math.abs(dx) < CLOSE ? p.y - CHEST : this.home;
    this.float += clamp(goal - this.float, -SINK * dt, SINK * dt);
    this.y = this.float + Math.sin(this.t * 2.4) * 9;
  }
}
