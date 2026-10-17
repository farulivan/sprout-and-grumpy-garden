// A snapdragon hiding in a mound of soil, where seeds bounce off it. When Pip comes close, the mound rumbles
// under a "!", then the flower snaps up, chomps for a moment and ducks back down. It teaches waiting for the
// warning: hop past while it is down, or shoot it while it is up.
import { GROUND } from '../../../config';
import { Enemy, type EnemyWorld } from './enemy';

export const SNAP_WARN = 0.8, // seconds the mound rumbles before the snap
  SNAP_UP = 0.7, // seconds it stays up, chomping
  SNAP_DOWN = 1.4; // seconds it stays down before it can stir again
const TRIGGER = 150; // how close across Pip comes before it stirs

export class Snapper extends Enemy {
  readonly kind = 'snapper';
  state: 'hidden' | 'warn' | 'up' | 'down' = 'hidden';
  timer = 0;

  constructor(x: number, y = GROUND) {
    super(x, y, 2);
  }

  hurtbox() {
    return this.state === 'up' ? { x: this.x, y: this.y - 46, r: 22 } : null;
  }
  override shield() {
    return this.state === 'up' ? null : { x: this.x, y: this.y - 12, r: 24 };
  }

  protected act(dt: number, w: EnemyWorld) {
    const p = w.player;
    this.timer -= dt;
    if (this.state === 'hidden') {
      if (p.alive && Math.abs(p.x - this.x) < TRIGGER) {
        this.state = 'warn';
        this.timer = SNAP_WARN;
        w.emit({ type: 'enemyWarn', x: this.x, y: this.y - 52 });
      }
    } else if (this.timer <= 0) {
      if (this.state === 'warn') {
        this.state = 'up';
        this.timer = SNAP_UP;
        w.emit({ type: 'snap', x: this.x, y: this.y - 46 });
      } else if (this.state === 'up') {
        this.state = 'down';
        this.timer = SNAP_DOWN;
      } else {
        this.state = 'hidden';
      }
    }
  }
}
