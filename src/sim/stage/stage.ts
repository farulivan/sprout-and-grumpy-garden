// One stage: a stretch of garden that Pip walks through from left to right, past small enemies, logs, thorns
// and pits, to a gate. The whole state plus the rules that advance it, as fight.ts is for a boss.
// States: play -> clear (Pip walks through the gate) -> exit (on to the boss)
//              | play -> down (Pip naps) -> lose
import { GROUND, H, STEP, W } from '../../config';
import type { SimEvent, StageResult } from '../events';
import { NO_INPUT, type InputFrame } from '../input';
import type { Level } from '../level';
import { circleHit, clamp, prune, rectCircleHit, type Rect } from '../math';
import { Placed } from '../pickups';
import { Player, type PlayerWorld } from '../player';
import type { Projectile } from '../projectile';
import { Rng } from '../rng';
import { ENEMIES } from './enemies';
import type { Enemy, EnemyKind, EnemyWorld } from './enemies/enemy';
import { STAGES, type StageId } from './stages';

export type StageState = 'play' | 'clear' | 'exit' | 'down' | 'lose';

// Where everything on a stage goes. A stage is mostly one of these (see stages/).
export interface StageData {
  readonly name: string;
  readonly length: number; // how wide the stage is
  readonly startX: number;
  readonly gateX: number; // walking past here clears the stage
  readonly ground: readonly (readonly [number, number])[]; // stretches of ground, from x to x; gaps are pits
  readonly logs: readonly { x: number; w: number; h: number }[]; // lying on the ground
  readonly platforms: readonly Rect[]; // one-way leaf pads
  readonly thorns: readonly { x: number; w: number }[]; // bramble patches on the ground
  // y: its feet, if not on the ground; level: how hard it is (see enemies/index.ts), 1 if not given
  readonly enemies: readonly { kind: EnemyKind; x: number; y?: number; level?: number }[];
  readonly dewdrops: readonly (readonly [number, number])[];
  readonly seeds: readonly (readonly [number, number])[]; // the golden seeds
}

export interface StageOptions {
  seed: number;
  stage?: StageId;
  data?: StageData; // a layout of its own instead of the stage's (tests build small ones)
  easy?: boolean; // 8 hearts instead of 5
}

const LOOK = 110; // the camera looks this far ahead of Pip, the way he is running
const SAFE = 48; // after a fall, Pip comes back on ground at least this far from either edge of it
const FELL = H + 40; // Pip's feet below this: he fell into a pit
const THORN_H = 22;
const WALK_IN = { ...NO_INPUT, right: true }; // at the gate, Pip walks on through by himself
// Every this many golden seeds make a heart, as a dewdrop does, and then the count starts again.
export const SEEDS_PER_HEART = 3;

export class Stage implements PlayerWorld, EnemyWorld, Level {
  state: StageState = 'play';
  readonly id: StageId;
  readonly name: string;
  readonly easy: boolean;
  readonly rng: Rng;
  readonly length: number;
  readonly startX: number;
  readonly gateX: number;
  readonly minX = 24;
  readonly maxX: number;
  readonly solids: readonly Rect[];
  readonly platforms: readonly Rect[];
  readonly thorns: readonly Rect[];
  readonly player: Player;
  enemies: Enemy[];
  projectiles: Projectile[] = [];
  pickups: Placed[];
  goldenSeeds = 0; // golden seeds found toward the next heart
  camX = 0; // the world x of the view's left edge
  pcamX = 0; // ...one step ago, for smooth drawing between steps
  t = 0;
  stageTime = 0;
  endT = 0; // seconds since the stage was decided
  timeScale = 1;
  private look = 0; // how far ahead the camera is looking
  private safeX: number; // where Pip comes back after a fall
  private events: SimEvent[] = [];

  constructor(opts: StageOptions) {
    this.id = opts.stage ?? 'gardenPath';
    const data = opts.data ?? STAGES[this.id];
    this.name = data.name;
    this.rng = new Rng(opts.seed);
    this.easy = !!opts.easy;
    this.length = data.length;
    this.startX = this.safeX = data.startX;
    this.gateX = data.gateX;
    this.maxX = data.length - 24;
    // the ground is a row of deep boxes, so Pip can't walk out of a pit sideways
    this.solids = [
      ...data.ground.map(([x0, x1]) => ({ x: x0, y: GROUND, w: x1 - x0, h: 300 })),
      ...data.logs.map((l) => ({ x: l.x, y: GROUND - l.h, w: l.w, h: l.h })),
    ];
    this.platforms = data.platforms;
    this.thorns = data.thorns.map((t) => ({ x: t.x, y: GROUND - THORN_H, w: t.w, h: THORN_H }));
    this.enemies = data.enemies.map((s) => ENEMIES[s.kind](s.x, s.y ?? GROUND, s.level ?? 1));
    this.pickups = [
      ...data.dewdrops.map(([x, y]) => new Placed('dew', x, y)),
      ...data.seeds.map(([x, y]) => new Placed('seed', x, y)),
    ];
    this.player = new Player(this);
    this.player.x = this.player.px = data.startX;
    if (this.easy) this.player.hp = this.player.maxHp = 8;
    this.camX = this.pcamX = this.cameraGoal();
  }

  get cheering() {
    return this.state === 'clear' || this.state === 'exit';
  }
  // How far along the path Pip is, from 0 at the start to 1 at the gate.
  get progress() {
    return clamp((this.player.x - this.startX) / (this.gateX - this.startX), 0, 1);
  }

  emit(e: SimEvent) {
    this.events.push(e);
  }
  // Everything that happened since the last call.
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // Advance the stage by exactly STEP seconds.
  step(input: InputFrame) {
    const dt = STEP,
      p = this.player;
    this.remember();
    if (this.state === 'exit' || this.state === 'lose') return;
    const sdt = dt * this.timeScale;
    this.t += sdt;
    if (this.state === 'play') this.stageTime += sdt;
    const walkIn = this.state === 'clear' && p.x < this.gateX + 70;
    p.update(sdt, this.state === 'play' ? input : walkIn ? WALK_IN : NO_INPUT);
    if (this.state === 'play') {
      if (p.y > FELL) this.fall();
      else this.rememberSafeGround();
    }
    this.follow(sdt);
    if (this.state !== 'down') for (const e of this.enemies) if (this.wakes(e)) e.update(sdt, this);
    for (const pr of this.projectiles) pr.update(sdt, this.camX);
    if (this.state === 'play') this.collide();
    prune(this.enemies);
    prune(this.projectiles);
    prune(this.pickups);

    if (this.state === 'play' && p.x >= this.gateX) {
      this.state = 'clear';
      this.endT = 0;
      for (const pr of this.projectiles) if (pr.owner !== 'player') pr.dead = true;
      this.emit({ type: 'stageClear', x: p.x, y: p.y, result: this.result() });
    } else if (this.state === 'clear') {
      this.endT += dt;
      if (this.endT > 2.2) {
        this.state = 'exit';
        this.emit({ type: 'stageExit' });
      }
    } else if (this.state === 'down') {
      this.endT += dt;
      if (this.endT > 2.2) {
        this.state = 'lose';
        this.emit({ type: 'lose', progress: Math.max(1, Math.round(this.progress * 100)) });
      }
    }
  }

  result(): StageResult {
    const p = this.player;
    return {
      time: this.stageTime,
      hits: p.hits,
      hearts: p.hp,
      easy: this.easy,
    };
  }

  // The camera keeps Pip near the middle, looking ahead the way he runs (and on that way when he stops),
  // and eases after him so it never jerks. It never shows past either end of the stage.
  private follow(dt: number) {
    const p = this.player;
    if (Math.abs(p.vx) > 40) this.look += (Math.sign(p.vx) * LOOK - this.look) * (1 - Math.exp(-dt * 1.6));
    this.camX += (this.cameraGoal() - this.camX) * (1 - Math.exp(-dt * 6));
  }
  private cameraGoal() {
    return clamp(this.player.x - W / 2 + this.look, 0, this.length - W);
  }

  // An enemy starts once it has come on screen, and only moves while it is near the view.
  private wakes(e: Enemy) {
    if (!e.awake && e.x < this.camX + W + 30) e.awake = true;
    return e.awake && e.x > this.camX - 240 && e.x < this.camX + W + 240;
  }

  // A pit costs a heart even while Pip is still flashing from a hit. He comes back on the last safe ground he
  // stood on, hopping away from the pit.
  private fall() {
    const p = this.player,
      fellAt = p.x;
    this.emit({ type: 'pitFall', x: fellAt });
    p.x = p.px = this.safeX;
    p.y = p.py = GROUND;
    p.vx = p.vy = 0;
    p.onGround = true;
    p.inv = 0;
    p.hurt(fellAt);
    if (!p.alive) this.onPlayerDown();
  }
  private rememberSafeGround() {
    const p = this.player;
    if (!p.onGround || p.y !== GROUND) return; // on a log or a leaf pad
    for (const s of this.solids)
      if (s.y === GROUND && p.x - s.x >= SAFE && s.x + s.w - p.x >= SAFE) {
        this.safeX = p.x;
        return;
      }
  }

  private collide() {
    const p = this.player,
      hb = p.hitbox;
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      if (pr.owner === 'player') this.seedHits(pr);
      else if (p.alive && circleHit(pr, hb)) {
        pr.dead = true;
        p.hurt(pr.x - pr.vx); // knocked the way it was flying
      }
    }
    for (const e of this.enemies) {
      const box = e.awake ? e.hurtbox() : null;
      if (box && p.alive && circleHit(box, hb)) p.hurt(e.x);
    }
    for (const t of this.thorns) if (p.alive && rectCircleHit(t, hb)) p.hurt(t.x + t.w / 2);
    for (const d of this.pickups) if (!d.dead && circleHit(d, hb)) this.take(d);
    if (!p.alive) this.onPlayerDown();
  }

  // One of Pip's seeds: the first enemy it touches is hit, or the seed bounces off if that one is hiding.
  private seedHits(pr: Projectile) {
    for (const e of this.enemies) {
      if (!e.awake || e.dead) continue;
      const box = e.hurtbox();
      if (box && circleHit(pr, box)) {
        pr.dead = true;
        if (e.hit()) this.emit({ type: 'enemyCheered', kind: e.kind, x: box.x, y: box.y, baseY: e.y });
        else this.emit({ type: 'enemyHit', x: pr.x, y: pr.y });
        return;
      }
      const shield = e.shield();
      if (shield && circleHit(pr, shield)) {
        pr.dead = true;
        this.emit({ type: 'enemyBlock', x: pr.x, y: pr.y });
        return;
      }
    }
  }

  private take(d: Placed) {
    d.dead = true;
    if (d.kind === 'dew') {
      this.emit({ type: 'pickup', x: d.x, y: d.y, healed: this.heal() });
      return;
    }
    const found = ++this.goldenSeeds;
    if (found < SEEDS_PER_HEART) {
      this.emit({ type: 'goldenSeed', x: d.x, y: d.y, found });
      return;
    }
    // the set is complete: it heals a heart, unless the hearts are full, and the count starts again
    this.goldenSeeds = 0;
    this.emit({ type: 'goldenSeed', x: d.x, y: d.y, found, healed: this.heal() });
  }

  // One heart back, never above the most. Returns whether there was one to fill.
  private heal() {
    const p = this.player,
      healed = p.hp < p.maxHp;
    if (healed) p.hp++;
    return healed;
  }

  private onPlayerDown() {
    this.state = 'down';
    this.endT = 0;
    for (const pr of this.projectiles) pr.dead = true;
    this.emit({ type: 'playerDown' });
  }

  // Keep each position from before this step, so drawing can blend between two steps.
  private remember() {
    this.pcamX = this.camX;
    for (const e of [this.player, ...this.enemies, ...this.projectiles]) {
      e.px = e.x;
      e.py = e.y;
    }
  }
}
