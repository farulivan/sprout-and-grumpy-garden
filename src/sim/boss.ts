// What every boss shares: health, three phases, the intro, and the attack scheduler.
// Attacks are generator functions: `yield seconds` pauses the attack. A boss subclass supplies its
// movement, its hurtboxes and its attacks (see bosses/sunny.ts).
import type { BossId } from './bosses';
import type { Fight } from './fight';
import type { Circle, Rect } from './math';
import { Dewdrop } from './pickups';

export type BossState = 'sleep' | 'intro' | 'fight' | 'defeated' | 'paused';
export type Mood = 'angry' | 'surprised' | 'happy';
export type Attack = Generator<number, void, undefined>;

export abstract class Boss {
  abstract readonly id: BossId;
  abstract readonly name: string;
  x = 0;
  y = 0;
  px = 0; // position one step ago, for smooth drawing between steps
  py = 0;
  hp: number;
  phase = 1;
  alive = true;
  state: BossState = 'sleep'; // sleep (title) -> intro -> fight -> defeated | paused
  t = 0;
  introT = 0;
  inv = 0; // seconds of invulnerability left
  telegraph = 0; // seconds the "!" warning is still showing
  flash = 0;
  puff = 0;
  happy = 0; // 0 -> 1 after being cheered up
  mood: Mood = 'angry';
  protected co: Attack | null = null;
  protected coWait = 0;
  protected idle = 1.2;
  protected lastAttack = '';

  constructor(
    protected fight: Fight,
    readonly maxHp: number,
  ) {
    this.hp = maxHp;
  }

  // Per-phase tuning, index = phase - 1.
  protected abstract readonly idleTime: readonly number[]; // pause between attacks
  protected abstract readonly speedMuls: readonly number[]; // projectile speed
  protected abstract move(dt: number): void;
  protected abstract chooseAttack(): Attack;
  abstract attack(name: string): Attack;
  // Damage multiplier for a shot at this spot: 2 = weak spot, 1 = body, 0 = miss.
  abstract hitTest(c: Circle): number;
  // The same hurtboxes as shapes, for the debug overlay.
  abstract hurtboxes(): { weak: Circle[]; body: Rect[] };

  get speedMul() {
    return this.speedMuls[this.phase - 1];
  }
  get attacking() {
    return this.co !== null;
  }

  hit(dmg: number): boolean {
    if (this.inv > 0 || !this.alive || this.state !== 'fight') return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 0.12;
    if (this.hp <= 0) {
      this.defeat();
      return true;
    }
    const ph = this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3;
    if (ph !== this.phase) {
      this.phase = ph;
      this.startPhase();
    }
    return true;
  }

  protected startPhase() {
    const f = this.fight;
    this.co = null;
    this.inv = 1.4;
    this.telegraph = 0;
    this.mood = 'angry';
    this.puff = 1;
    this.idle = 1.3;
    f.pickups.push(new Dewdrop(f.rng.range(120, 600), -20));
    f.emit({ type: 'phase', phase: this.phase, x: this.x, y: this.y });
  }

  protected defeat() {
    this.alive = false;
    this.state = 'defeated';
    this.co = null;
    this.mood = 'happy';
    this.fight.onBossDefeated();
  }

  // Stop attacking for good (Pip is down).
  halt() {
    this.state = 'paused';
    this.co = null;
    this.telegraph = 0;
    this.mood = 'angry';
  }

  // Start a specific attack now, instead of waiting for the scheduler to pick one.
  startAttack(name: string) {
    this.co = this.attack(name);
    this.coWait = 0;
  }

  update(dt: number) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.inv = Math.max(0, this.inv - dt);
    this.telegraph = Math.max(0, this.telegraph - dt);
    this.puff += (0 - this.puff) * Math.min(1, dt * 5);
    this.move(dt);
    if (this.state === 'intro') {
      const before = this.introT;
      this.introT += dt;
      if (before < 0.9 && this.introT >= 0.9) this.fight.emit({ type: 'introRoar' });
      if (this.introT > 1.7) {
        this.state = 'fight';
        this.mood = 'angry';
        this.fight.emit({ type: 'fightStart' });
      }
      return;
    }
    if (this.state === 'defeated') {
      this.happy = Math.min(1, this.happy + dt * 0.5);
      return;
    }
    if (this.state !== 'fight') return;
    if (this.co) {
      this.coWait -= dt;
      while (this.co && this.coWait <= 0) {
        const r = this.co.next();
        if (r.done) this.co = null;
        else this.coWait += r.value;
      }
    } else {
      this.idle -= dt;
      if (this.idle <= 0) {
        this.co = this.chooseAttack();
        this.coWait = 0;
      }
    }
  }

  // Every attack starts with a warning and ends with endAttack().
  protected warn(t: number) {
    this.telegraph = t;
    this.mood = 'surprised';
    this.fight.emit({ type: 'telegraph' });
  }
  protected endAttack() {
    this.idle = this.idleTime[this.phase - 1];
    this.mood = 'angry';
  }
}
