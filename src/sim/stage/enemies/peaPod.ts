// A pea plant with one fat pod, looking back down the path. When Pip comes near, the pod swells under a "!"
// and spits a pea straight at him, at the height of his chest: hop over it, or cheer the pod up first. Once
// he is past, it can't turn to him. It teaches what the "!" means, before Sunny uses it. From level 2 it spits
// two peas after each "!", the second a beat after the first.
import { GROUND } from '../../../config';
import { Projectile } from '../../projectile';
import { Enemy, type EnemyWorld } from './enemy';

export const PEA_WARN = 0.9; // seconds of "!" before each pea
const RANGE = 560, // it only spits at Pip when he is in front of it and this close
  REST = 1.6, // seconds between its last pea and the next "!"
  BEAT = 0.45, // seconds between two peas
  PEA_SPEED = 280,
  MOUTH = 26; // how high the pea flies: a standing Pip's chest

export class PeaPod extends Enemy {
  readonly kind = 'peaPod';
  warn = 0; // seconds of "!" left
  spitT = -1; // its clock when it last spat; only for drawing (the pod gapes for a moment)
  private rest = 0.6;
  private more = 0; // peas still to spit after this "!"

  constructor(
    x: number,
    y = GROUND,
    private readonly level = 1,
  ) {
    super(x, y, 3);
  }

  hurtbox() {
    return { x: this.x, y: this.y - 28, r: 22 };
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player;
    if (this.warn > 0) {
      this.warn -= dt;
      if (this.warn <= 0) {
        this.more = this.level >= 2 ? 2 : 1;
        this.rest = 0;
      }
      return;
    }
    if (this.more > 0) {
      this.rest -= dt;
      if (this.rest <= 0) this.spit(w);
      return;
    }
    this.rest -= dt;
    const ahead = (p.x - this.x) * this.facing; // how far in front of it Pip is
    if (this.rest <= 0 && p.alive && ahead > 0 && ahead < RANGE) {
      this.warn = PEA_WARN;
      w.emit({ type: 'enemyWarn', x: this.x, y: this.y - 72 });
    }
  }

  private spit(w: EnemyWorld) {
    const x = this.x + this.facing * 26,
      y = this.y - MOUTH;
    w.projectiles.push(
      new Projectile({
        x,
        y,
        vx: this.facing * PEA_SPEED,
        vy: 0,
        r: 8,
        owner: 'enemy',
        kind: 'pea',
        life: 4,
      }),
    );
    w.emit({ type: 'pea', x, y });
    this.spitT = this.t;
    this.more--;
    this.rest = this.more > 0 ? BEAT : REST;
  }
}
