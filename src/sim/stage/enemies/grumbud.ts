// A grumpy flower bud on two root feet. It waddles along whatever it stands on and turns back at walls and
// edges, so one on a leaf pad keeps to its pad. It teaches the first lesson: shoot it before it bumps into you.
import { solidAt, supportAt } from '../terrain';
import { Enemy, type EnemyWorld } from './enemy';

const SPEED = 55;

export class Grumbud extends Enemy {
  readonly kind = 'grumbud';

  constructor(x: number, y: number) {
    super(x, y, 2);
  }

  hurtbox() {
    return { x: this.x, y: this.y - 20, r: 18 };
  }

  protected act(dt: number, w: EnemyWorld) {
    const next = this.x + this.facing * SPEED * dt,
      toe = next + this.facing * 14;
    if (!supportAt(w, toe, this.y) || solidAt(w.solids, toe, this.y - 12))
      this.facing = this.facing > 0 ? -1 : 1;
    else this.x = next;
  }
}
