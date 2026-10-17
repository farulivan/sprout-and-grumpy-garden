// One boss fight: the whole game state plus the rules that advance it.
// States: title (boss asleep behind the title card) | play -> ending (boss blooms) -> win
//                                                    | play -> down (Pip naps) -> lose
import { ARENA_R, STEP } from '../config';
import { platforms } from './arena';
import type { Boss } from './boss';
import { BOSSES, type BossId } from './bosses';
import type { FightResult, SimEvent } from './events';
import type { Hazard } from './hazards';
import type { InputFrame } from './input';
import { circleHit, prune } from './math';
import type { Dewdrop } from './pickups';
import { PIP_LOWEST, Player, type PlayerWorld } from './player';
import type { Projectile } from './projectile';
import { Rng } from './rng';

export type FightState = 'title' | 'play' | 'ending' | 'win' | 'down' | 'lose';

export interface FightOptions {
  seed: number;
  boss?: BossId;
  easy?: boolean; // 8 hearts instead of 5
  title?: boolean; // the sleepy scene behind the title card: nothing fights
}

export class Fight implements PlayerWorld {
  state: FightState;
  readonly easy: boolean;
  readonly rng: Rng;
  readonly minX = 24;
  readonly maxX = ARENA_R;
  readonly platforms = platforms;
  readonly player: Player;
  readonly boss: Boss;
  projectiles: Projectile[] = [];
  hazards: Hazard[] = [];
  pickups: Dewdrop[] = [];
  t = 0;
  fightTime = 0;
  faceHits = 0;
  endT = 0; // seconds since the fight was decided
  timeScale = 1; // below 1 = slow motion
  private events: SimEvent[] = [];

  constructor(opts: FightOptions) {
    this.rng = new Rng(opts.seed);
    this.easy = !!opts.easy;
    this.player = new Player(this);
    this.boss = BOSSES[opts.boss ?? 'sunny'](this);
    if (this.easy) this.player.hp = this.player.maxHp = 8;
    if (opts.title) {
      this.state = 'title';
    } else {
      this.state = 'play';
      this.boss.state = 'intro';
    }
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

  // Advance the fight by exactly STEP seconds.
  step(input: InputFrame) {
    const dt = STEP;
    this.remember();
    if (this.state === 'title' || this.state === 'win' || this.state === 'lose') {
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
    if (this.state === 'play') this.collide();
    prune(this.projectiles);
    prune(this.hazards);
    prune(this.pickups);

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
    this.emit({ type: 'bossDefeated', x: this.boss.x, y: this.boss.y });
  }

  private onPlayerDown() {
    this.state = 'down';
    this.endT = 0;
    this.boss.halt();
    for (const p of this.projectiles) p.dead = true;
    for (const h of this.hazards) h.dead = true;
    this.emit({ type: 'playerDown' });
  }

  // Keep each position from before this step, so drawing can blend between two steps.
  private remember() {
    const all = [this.player, this.boss, ...this.projectiles, ...this.hazards, ...this.pickups];
    for (const e of all) {
      e.px = e.x;
      e.py = e.y;
    }
  }

  private collide() {
    const p = this.player,
      b = this.boss,
      hb = p.hitbox;
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      if (pr.owner === 'player') {
        if (!b.alive) continue;
        const mult = b.hitTest(pr);
        if (!mult) continue;
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
