// One boss fight: the whole game state plus the rules that advance it. A boss can also bring small enemies and
// bounce pads with him; in a fight without any, those lists stay empty and change nothing.
// States: play -> ending (boss blooms) -> win
//         play -> down (Pip naps) -> lose
import { GROUND, STEP, W } from '../config';
import type { Boss } from './boss';
import { Bouncer, type Springy } from './bouncer';
import { BOSSES, type BossId } from './bosses';
import type { FightResult, SimEvent } from './events';
import type { Hazard } from './hazards';
import type { InputFrame } from './input';
import type { Level } from './level';
import { circleHit, clamp, prune, type Rect } from './math';
import type { Dewdrop } from './pickups';
import { PIP_LOWEST, Player, type PlayerWorld } from './player';
import type { Projectile } from './projectile';
import { Rng } from './rng';
import type { Enemy, EnemyWorld } from './stage/enemies/enemy';

export type FightState = 'play' | 'ending' | 'win' | 'down' | 'lose';
const PAD_LIFE = 8; // seconds a bounce pad lasts in a fight, before it wilts

export interface FightOptions {
  seed: number;
  boss?: BossId;
  easy?: boolean; // 8 hearts instead of 5
  hearts?: number; // start with this many: the hearts Pip carried in from the stage before
}

export class Fight implements PlayerWorld, Level {
  state: FightState = 'play';
  readonly easy: boolean;
  readonly rng: Rng;
  readonly minX = 24;
  readonly maxX: number; // these two are the boss's arena
  readonly platforms: readonly Rect[];
  readonly player: Player;
  readonly boss: Boss;
  projectiles: Projectile[] = [];
  hazards: Hazard[] = [];
  pickups: Dewdrop[] = [];
  enemies: Enemy[] = [];
  pads: Bouncer[] = []; // bounce pads, which wilt
  readonly bouncers: Springy[] = []; // everything that throws Pip up: the pads, and a boss's bouncy cap
  t = 0;
  fightTime = 0;
  faceHits = 0;
  endT = 0; // seconds since the fight was decided
  timeScale = 1; // below 1 = slow motion
  private events: SimEvent[] = [];
  private readonly enemyWorld: EnemyWorld;

  constructor(opts: FightOptions) {
    this.rng = new Rng(opts.seed);
    this.easy = !!opts.easy;
    this.player = new Player(this);
    this.boss = BOSSES[opts.boss ?? 'sunny'](this);
    this.maxX = this.boss.maxX;
    this.platforms = this.boss.platforms;
    this.enemyWorld = {
      player: this.player,
      minX: this.minX,
      maxX: this.maxX,
      closed: true, // nowhere for Pip to run past them to
      solids: [{ x: -100, y: GROUND, w: W + 200, h: 300 }],
      platforms: this.platforms,
      projectiles: this.projectiles,
      emit: (e) => this.emit(e),
    };
    if (this.easy) this.player.hp = this.player.maxHp = 8;
    if (opts.hearts !== undefined) this.player.hp = clamp(Math.round(opts.hearts), 1, this.player.maxHp);
    this.boss.state = 'intro';
  }

  get cheering() {
    return this.state === 'ending' || this.state === 'win';
  }

  emit(e: SimEvent) {
    this.events.push(e);
  }
  addEnemy(e: Enemy) {
    e.awake = true;
    this.enemies.push(e);
  }
  // Everything that happened since the last call.
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // Advance the fight by exactly STEP seconds.
  step(input: InputFrame) {
    const dt = STEP;
    this.remember();
    if (this.state === 'win' || this.state === 'lose') {
      this.boss.update(dt);
      return;
    }
    const sdt = dt * this.timeScale;
    this.t += sdt;
    if (this.state === 'play') this.fightTime += sdt;
    this.player.update(sdt, input);
    this.boss.update(sdt);
    for (const p of this.projectiles) {
      p.update(sdt);
      // Petals fly straight, so the low ones in a fan dive into the ground. Once one is wholly below
      // anything Pip can reach it can never hit him, so it bursts there instead of sliding on through the soil.
      if (p.kind === 'petal' && p.y - p.r >= PIP_LOWEST) p.dead = p.hitGround = true;
      if (p.hitGround) this.emit({ type: 'groundPuff', x: p.x, kind: p.kind });
    }
    for (const h of this.hazards) h.update(sdt);
    for (const d of this.pickups) d.update(sdt);
    if (this.state !== 'down') for (const e of this.enemies) e.update(sdt, this.enemyWorld);
    for (const b of this.pads) b.update(sdt);
    if (this.state === 'play') this.collide();
    prune(this.projectiles);
    prune(this.hazards);
    prune(this.pickups);
    prune(this.enemies);
    prune(this.pads);
    prune(this.bouncers);

    if (this.state === 'ending') {
      this.endT += dt;
      this.timeScale = this.endT < 1.2 ? 0.25 : 1;
      if (this.endT > 1.2 && Math.floor(this.endT * 5) !== Math.floor((this.endT - dt) * 5))
        this.emit({ type: 'confetti' });
      if (this.endT > 4.5) {
        this.state = 'win';
        this.emit({ type: 'win', result: this.result() });
      }
    } else if (this.state === 'down') {
      this.endT += dt;
      if (this.endT > 2.2) {
        this.state = 'lose';
        const progress = Math.max(1, Math.round((1 - this.boss.hp / this.boss.maxHp) * 100));
        this.emit({ type: 'lose', progress });
      }
    }
  }

  result(): FightResult {
    const hits = this.player.hits;
    return { time: this.fightTime, hits, stars: hits <= 1 ? 3 : hits <= 3 ? 2 : 1, easy: this.easy };
  }

  onBossDefeated() {
    this.state = 'ending';
    this.endT = 0;
    this.timeScale = 0.25;
    for (const p of this.projectiles) if (p.owner !== 'player') p.dead = true;
    for (const h of this.hazards) h.dead = true;
    for (const e of this.enemies) e.dead = true;
    this.emit({ type: 'bossDefeated', x: this.boss.x, y: this.boss.y });
  }

  private onPlayerDown() {
    this.state = 'down';
    this.endT = 0;
    this.boss.halt();
    for (const p of this.projectiles) p.dead = true;
    for (const h of this.hazards) h.dead = true;
    for (const e of this.enemies) e.dead = true;
    this.emit({ type: 'playerDown' });
  }

  // Keep each position from before this step, so drawing can blend between two steps.
  private remember() {
    const all = [
      this.player,
      this.boss,
      ...this.projectiles,
      ...this.hazards,
      ...this.pickups,
      ...this.enemies,
    ];
    for (const e of all) {
      e.px = e.x;
      e.py = e.y;
    }
  }

  // One of Pip's seeds on a small enemy, if it touched one. Whether it did.
  private seedHitsEnemy(pr: Projectile) {
    for (const e of this.enemies) {
      if (e.dead || e.entering > 0) continue;
      const box = e.hurtbox();
      if (!box || !circleHit(pr, box)) continue;
      pr.dead = true;
      if (!e.hit()) this.emit({ type: 'enemyHit', x: pr.x, y: pr.y });
      else {
        this.emit({ type: 'enemyCheered', kind: e.kind, x: box.x, y: box.y, baseY: e.y });
        if (e.kind === 'capling') {
          const pad = new Bouncer(e.x, e.y, PAD_LIFE);
          this.pads.push(pad);
          this.bouncers.push(pad);
          this.emit({ type: 'padReady', x: e.x, y: e.y, first: false });
        }
      }
      return true;
    }
    return false;
  }

  private collide() {
    const p = this.player,
      b = this.boss,
      hb = p.hitbox;
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      if (pr.owner === 'player') {
        if (this.seedHitsEnemy(pr)) continue;
        if (!b.alive) continue;
        const mult = b.hitTest(pr);
        if (!mult) {
          if (b.blocks(pr)) {
            pr.dead = true;
            this.emit({ type: 'bossBlock', x: pr.x, y: pr.y });
          }
          continue;
        }
        pr.dead = true;
        if (b.hit(mult)) {
          if (mult > 1) this.faceHits++;
          this.emit({ type: 'bossHit', x: pr.x, y: pr.y, weak: mult > 1 });
        } else this.emit({ type: 'bossBlock', x: pr.x, y: pr.y }); // still waking up, or just changed phase
      } else if (p.alive && circleHit(pr, hb)) {
        pr.dead = true;
        p.hurt();
      }
    }
    for (const h of this.hazards) if (!h.dead && p.alive && h.hits(hb)) p.hurt();
    if (p.alive && b.alive && b.touches(hb)) p.hurt(b.x);
    for (const e of this.enemies) {
      const box = e.entering <= 0 ? e.hurtbox() : null;
      if (!box || !p.alive || !circleHit(box, hb)) continue;
      p.hurt(e.x);
      if (e.spentOnTouch) {
        e.dead = true;
        this.emit({ type: 'enemyBurst', x: e.x, y: e.y });
      }
    }
    for (const d of this.pickups) {
      if (d.dead || !circleHit(d, hb)) continue;
      d.dead = true;
      const healed = p.hp < p.maxHp;
      if (healed) p.hp++;
      this.emit({ type: 'pickup', x: d.x, y: d.y, healed });
    }
    if (!p.alive) this.onPlayerDown();
  }
}
