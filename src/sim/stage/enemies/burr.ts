// A prickly seed head. When Pip comes in sight it curls up under a "!", rolls at him, and stops dizzy at the
// first wall, edge or log, or when it runs out of roll. Seeds bounce off until then; while it is dizzy they
// land. It always hurts to touch. It teaches jumping what can't be shot, as Mo's shockwaves will need. Once Pip
// is past it stays behind him, unless he is shut in a glade with it.
import { solidAt, supportAt } from '../terrain';
import { Enemy, type EnemyWorld } from './enemy';

export const BURR_WARN = 0.55, // seconds of "!" before it rolls
  BURR_DIZZY = 2.4; // seconds it can be hit for, once it has stopped
const SPEED = 350,
  ROLL_FOR = 2.2, // seconds it rolls with nothing in its way
  REST = 1, // seconds after it comes round before it can stir again
  SIGHT = 340, // how close across Pip comes before it stirs: near enough that he has to hop it soon after the "!"
  R = 20;

export class Burr extends Enemy {
  readonly kind = 'burr';
  state: 'idle' | 'warn' | 'roll' | 'dizzy' = 'idle';
  timer = 0;

  constructor(x: number, y: number) {
    super(x, y, 3);
  }

  hurtbox() {
    return { x: this.x, y: this.y - R, r: R };
  }
  override get hittable() {
    return this.state === 'dizzy';
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player,
      dx = p.x - this.x;
    this.timer -= dt;
    if (this.state === 'idle') {
      if (this.timer > 0 || !p.alive || Math.abs(dx) > SIGHT) return;
      if (w.closed) this.facing = dx < 0 ? -1 : 1;
      if (dx * this.facing <= 0) return;
      this.state = 'warn';
      this.timer = BURR_WARN;
      w.emit({ type: 'enemyWarn', x: this.x, y: this.y - 56 });
    } else if (this.state === 'warn') {
      if (this.timer > 0) return;
      this.state = 'roll';
      this.timer = ROLL_FOR;
    } else if (this.state === 'roll') {
      const next = this.x + this.facing * SPEED * dt,
        toe = next + this.facing * R;
      if (
        this.timer <= 0 ||
        toe < w.minX ||
        toe > w.maxX ||
        !supportAt(w, toe, this.y) ||
        solidAt(w.solids, toe, this.y - 12)
      ) {
        this.state = 'dizzy';
        this.timer = BURR_DIZZY;
        w.emit({ type: 'thud', x: this.x, y: this.y });
      } else this.x = next;
    } else if (this.timer <= 0) {
      this.state = 'idle';
      this.timer = REST;
    }
  }
}
