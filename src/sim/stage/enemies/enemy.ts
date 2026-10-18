// What every small enemy on a stage shares. They are garden plants in a grumpy mood: a few seeds cheer one up,
// and it pops into a flower. Each kind lives in a file beside this one.
import type { SimEvent } from '../../events';
import type { Circle, Rect } from '../../math';
import type { Player } from '../../player';
import type { Projectile } from '../../projectile';

export type EnemyKind = 'grumbud' | 'puffball' | 'peaPod' | 'snapper';

// What an enemy can see and do.
export interface EnemyWorld {
  readonly player: Player;
  readonly solids: readonly Rect[];
  readonly platforms: readonly Rect[];
  readonly projectiles: Projectile[];
  emit(e: SimEvent): void;
}

export abstract class Enemy {
  abstract readonly kind: EnemyKind;
  px: number; // position one step ago, for smooth drawing between steps
  py: number;
  hp: number;
  t = 0;
  flash = 0; // seconds of the white flash after a hit
  facing: 1 | -1 = -1; // Pip comes from the left
  awake = false; // set once it has come on screen; asleep, it does nothing
  dead = false; // cheered up

  constructor(
    public x: number,
    public y: number, // its feet, or for a flyer its middle
    readonly maxHp: number,
  ) {
    this.px = x;
    this.py = y;
    this.hp = maxHp;
  }

  // Where seeds land on it and where it hurts Pip, or null while it is out of reach.
  abstract hurtbox(): Circle | null;
  // Where seeds bounce off it without doing anything, or null.
  shield(): Circle | null {
    return null;
  }

  update(dt: number, w: EnemyWorld) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.act(dt, w);
  }
  protected abstract act(dt: number, w: EnemyWorld): void;

  // One seed's worth of cheering up. Returns whether that was the last one it needed.
  hit(): boolean {
    this.hp--;
    this.flash = 0.12;
    if (this.hp <= 0) this.dead = true;
    return this.dead;
  }
}
