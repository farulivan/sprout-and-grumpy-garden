import { GROUND, H, W } from '../config';

export type ProjectileKind = 'sprout' | 'bossSeed' | 'petal';

export interface ProjectileInit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  owner: 'player' | 'boss';
  kind: ProjectileKind;
  life: number;
  gravity?: number;
}

export class Projectile {
  x: number;
  y: number;
  px: number; // position one step ago, for smooth drawing between steps
  py: number;
  vx: number;
  vy: number;
  r: number;
  gravity: number;
  owner: 'player' | 'boss';
  kind: ProjectileKind;
  life: number;
  t = 0;
  dead = false;
  hitGround = false;

  constructor(o: ProjectileInit) {
    this.x = this.px = o.x;
    this.y = this.py = o.y;
    this.vx = o.vx;
    this.vy = o.vy;
    this.r = o.r;
    this.gravity = o.gravity ?? 0;
    this.owner = o.owner;
    this.kind = o.kind;
    this.life = o.life;
  }

  // viewLeft: the world x of the view's left edge. Whatever flies out of the view is gone.
  update(dt: number, viewLeft = 0) {
    this.t += dt;
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const x = this.x - viewLeft;
    if (this.life <= 0 || x < -40 || x > W + 40 || this.y > H + 40 || this.y < -160) this.dead = true;
    if (this.gravity && this.y + this.r >= GROUND) {
      this.dead = true;
      this.hitGround = true;
    }
  }
}
