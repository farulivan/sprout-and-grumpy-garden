// Boss hazards. Each one shows a warning before it can hurt: a kids' game should never hurt without warning.
// shape() is the area that hurts right now, or null while the hazard is still harmless.
import { GROUND, W } from '../config';
import { circleHit, rectCircleHit, type Circle, type Rect } from './math';

export const VINE_WARN = 0.7;
export const ROOT_WARN = 0.75;
export const POLLEN_WARN = 0.9;
export const POLLEN_CLOUD = 0.5;
export const WAVE_WARN = 0.1;
export const GLOOM_FOLLOW = 1.5,
  GLOOM_WARN = 0.8,
  GLOOM_RAIN = 1.1;

export interface Hazard {
  readonly kind: 'vine' | 'root' | 'pollen' | 'shockwave' | 'gloom';
  x: number;
  y: number;
  px: number;
  py: number;
  dead: boolean;
  update(dt: number): void;
  shape(): Circle | Rect | null;
  hits(c: Circle): boolean;
}

const overlaps = (s: Circle | Rect | null, c: Circle) =>
  !!s && ('r' in s ? circleHit(s, c) : rectCircleHit(s, c));

// A vine slides along the ground from the right edge. Jump over it (or stand on a leaf platform).
export class VineSweep implements Hazard {
  readonly kind = 'vine';
  readonly w = 150;
  readonly h = 34;
  x = W + 40;
  px = W + 40;
  readonly y = GROUND - this.h;
  readonly py = this.y;
  t = 0;
  warn = VINE_WARN;
  dead = false;
  constructor(public speed = 380) {}

  update(dt: number) {
    this.t += dt;
    if (this.warn > 0) {
      this.warn -= dt;
      return;
    }
    this.x -= this.speed * dt;
    if (this.x + this.w + 80 < 0) this.dead = true;
  }
  shape(): Rect | null {
    return this.warn <= 0 ? { x: this.x + 8, y: this.y + 6, w: this.w - 16, h: this.h - 6 } : null;
  }
  hits(c: Circle) {
    return overlaps(this.shape(), c);
  }
}

// A root pops out of the ground at a marked spot. Step away from the "!" mark.
export class RootSpike implements Hazard {
  readonly kind = 'root';
  readonly w = 46;
  readonly h = 96;
  readonly y = GROUND;
  readonly py = GROUND;
  px: number;
  t = 0;
  warn = ROOT_WARN;
  up = 0; // 0 = underground, 1 = fully out
  hold = 0.45;
  phase: 'warn' | 'up' | 'hold' | 'down' = 'warn';
  dead = false;
  constructor(public x: number) {
    this.px = x;
  }

  update(dt: number) {
    this.t += dt;
    if (this.phase === 'warn') {
      this.warn -= dt;
      if (this.warn <= 0) this.phase = 'up';
    } else if (this.phase === 'up') {
      this.up = Math.min(1, this.up + dt * 8);
      if (this.up >= 1) this.phase = 'hold';
    } else if (this.phase === 'hold') {
      this.hold -= dt;
      if (this.hold <= 0) this.phase = 'down';
    } else {
      this.up -= dt * 3;
      if (this.up <= 0) this.dead = true;
    }
  }
  shape(): Rect | null {
    if (this.phase === 'warn' || this.up < 0.3) return null;
    const h = this.h * this.up;
    return { x: this.x - this.w / 2 + 8, y: GROUND - h, w: this.w - 16, h };
  }
  hits(c: Circle) {
    return overlaps(this.shape(), c);
  }
}

// Pollen falls from the sky onto a marked spot, then leaves a short-lived cloud.
export class PollenDrop implements Hazard {
  readonly kind = 'pollen';
  readonly r = 14;
  px: number;
  y = -30;
  py = -30;
  t = 0;
  warn: number;
  cloud = POLLEN_CLOUD;
  phase: 'warn' | 'fall' | 'cloud' = 'warn';
  dead = false;
  constructor(
    public x: number,
    delay = 0,
  ) {
    this.px = x;
    this.warn = POLLEN_WARN + delay;
  }

  update(dt: number) {
    this.t += dt;
    if (this.phase === 'warn') {
      this.warn -= dt;
      if (this.warn <= 0) this.phase = 'fall';
    } else if (this.phase === 'fall') {
      this.y += 520 * dt;
      if (this.y + this.r >= GROUND) {
        this.y = GROUND - this.r;
        this.phase = 'cloud';
      }
    } else {
      this.cloud -= dt;
      if (this.cloud <= 0) this.dead = true;
    }
  }
  shape(): Circle | null {
    if (this.phase === 'fall') return { x: this.x, y: this.y, r: this.r - 2 };
    if (this.phase === 'cloud') return { x: this.x, y: GROUND - 14, r: 22 };
    return null;
  }
  hits(c: Circle) {
    return overlaps(this.shape(), c);
  }
}

// A wave running along the ground each way from where Mo lands. Jump it. It rears up for a moment first.
export class Shockwave implements Hazard {
  readonly kind = 'shockwave';
  readonly w = 36;
  readonly h = 26;
  readonly y = GROUND - this.h;
  readonly py = this.y;
  px: number;
  t = 0;
  warn = WAVE_WARN;
  dead = false;
  constructor(
    public x: number,
    readonly dir: 1 | -1,
    readonly speed: number,
    private readonly minX: number,
    private readonly maxX: number,
  ) {
    this.px = x;
  }

  update(dt: number) {
    this.t += dt;
    if (this.warn > 0) {
      this.warn -= dt;
      return;
    }
    this.x += this.dir * this.speed * dt;
    if (this.x < this.minX || this.x > this.maxX) this.dead = true;
  }
  shape(): Rect | null {
    return this.warn > 0 ? null : { x: this.x - this.w / 2 + 4, y: this.y + 4, w: this.w - 8, h: this.h - 4 };
  }
  hits(c: Circle) {
    return overlaps(this.shape(), c);
  }
}

// A small rain cloud that follows Pip, stops, gathers itself, then rains straight down, even through a shelf.
// Keep moving: this is what stops there being any safe spot.
export class GloomCloud implements Hazard {
  readonly kind = 'gloom';
  readonly y = 96;
  readonly py = this.y;
  readonly w = 58;
  px: number;
  t = 0;
  state: 'follow' | 'warn' | 'rain' = 'follow';
  private timer: number;
  dead = false;
  constructor(
    private readonly target: { readonly x: number },
    public x: number,
    private readonly speed: number,
    delay = 0,
  ) {
    this.px = x;
    this.timer = GLOOM_FOLLOW + delay;
  }

  update(dt: number) {
    this.t += dt;
    this.timer -= dt;
    if (this.state === 'follow') {
      const d = this.target.x - this.x,
        step = this.speed * dt;
      this.x += Math.abs(d) <= step ? d : Math.sign(d) * step;
      if (this.timer <= 0) {
        this.state = 'warn';
        this.timer = GLOOM_WARN;
      }
    } else if (this.timer <= 0) {
      if (this.state === 'warn') {
        this.state = 'rain';
        this.timer = GLOOM_RAIN;
      } else this.dead = true;
    }
  }
  shape(): Rect | null {
    if (this.state !== 'rain') return null;
    return { x: this.x - this.w / 2, y: this.y + 14, w: this.w, h: GROUND - this.y - 14 };
  }
  hits(c: Circle) {
    return overlaps(this.shape(), c);
  }
}
