// A pod of spores Mo blows out: it drifts slowly at Pip, and bursts when it touches him or a seed, or when it
// has drifted long enough. Dodge it, or spend shots popping it.
import { Enemy, type EnemyWorld } from './enemy';

const CHEST = 22, // how far above his feet it heads for
  LIFE = 7; // seconds before it bursts by itself

export class SporeBubble extends Enemy {
  readonly kind = 'spore';
  private life = LIFE;

  constructor(
    x: number,
    y: number,
    private readonly speed: number,
  ) {
    super(x, y, 1);
    this.awake = true;
  }

  hurtbox() {
    return { x: this.x, y: this.y, r: 15 };
  }
  override get spentOnTouch() {
    return true;
  }
  override bloomY() {
    return null;
  }

  protected act(dt: number, w: EnemyWorld) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      w.emit({ type: 'enemyBurst', x: this.x, y: this.y, kind: this.kind });
    }
    const p = w.player,
      dx = p.x - this.x,
      dy = p.y - CHEST - this.y,
      d = Math.hypot(dx, dy) || 1;
    this.facing = dx < 0 ? -1 : 1;
    this.x += (dx / d) * this.speed * dt;
    this.y += (dy / d) * this.speed * dt;
  }
}
