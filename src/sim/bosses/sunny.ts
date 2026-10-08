// Sunny the Grumpy Sunflower. Rooted on the right; the head (x, y, r) is the 2x-damage hurtbox,
// stemBox is the 1x-damage hurtbox reachable from the ground.
// Add an attack by writing another *name() generator that ends with this.endAttack(), then list it in
// ATTACKS and in POOLS for the phases that should use it.
import { ARENA_R, GROUND } from '../../config';
import { Boss, type Attack } from '../boss';
import type { Fight } from '../fight';
import { PollenDrop, RootSpike, VineSweep } from '../hazards';
import { circleHit, clamp, rectCircleHit, type Circle, type Rect } from '../math';
import { Projectile } from '../projectile';

const ATTACKS = ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain', 'rootPop'] as const;
type SunnyAttack = (typeof ATTACKS)[number];

const POOLS: Record<number, readonly SunnyAttack[]> = {
  1: ['seedSpit', 'petalFan'],
  2: ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain'],
  3: ['seedSpit', 'petalFan', 'vineSweep', 'pollenRain', 'rootPop'],
};

export class Sunny extends Boss {
  readonly id = 'sunny' as const;
  readonly name = 'Sunny the Sunflower';
  readonly baseX = 790;
  readonly baseY = 230;
  readonly r = 58;
  lean = 0; // leans toward Pip while fighting
  protected readonly idleTime = [1.5, 1.1, 0.8];
  protected readonly speedMuls = [1, 1.15, 1.35];

  constructor(fight: Fight) {
    super(fight, 400);
    this.x = this.px = this.baseX;
    this.y = this.py = this.baseY;
  }

  get stemBox(): Rect {
    return { x: this.baseX - 18, y: GROUND - 175, w: 36, h: 175 };
  }
  hitTest(c: Circle) {
    return circleHit(c, this) ? 2 : rectCircleHit(this.stemBox, c) ? 1 : 0;
  }
  hurtboxes() {
    return { weak: [{ x: this.x, y: this.y, r: this.r }], body: [this.stemBox] };
  }

  protected move(dt: number) {
    const p = this.fight.player;
    const target = this.state === 'fight' ? (p.x - this.baseX) * 0.04 : 0;
    this.lean += (target - this.lean) * Math.min(1, dt * 2);
    const sway = this.state === 'sleep' ? 0.5 : 1;
    this.x = this.baseX + Math.sin(this.t * 0.7) * 14 * sway + this.lean;
    this.y = this.baseY + Math.sin(this.t * 1.3) * 18 * sway;
  }

  protected chooseAttack(): Attack {
    const pool = POOLS[this.phase];
    let name: SunnyAttack;
    do name = this.fight.rng.pick(pool);
    while (name === this.lastAttack && pool.length > 1);
    this.lastAttack = name;
    return this[name]();
  }
  attack(name: string): Attack {
    if (!(ATTACKS as readonly string[]).includes(name)) throw new Error(`Sunny has no attack "${name}"`);
    return this[name as SunnyAttack]();
  }

  // Lob a seed that lands at tx after T seconds.
  private spit(tx: number, T: number) {
    const g = 900,
      sx = this.x - 30,
      sy = this.y + 20;
    const vx = (tx - sx) / T,
      vy = (GROUND - sy - 0.5 * g * T * T) / T;
    this.fight.projectiles.push(
      new Projectile({ x: sx, y: sy, vx, vy, gravity: g, r: 11, owner: 'boss', kind: 'bossSeed', life: 4 }),
    );
    this.puff = 0.6;
    this.fight.emit({ type: 'spit' });
  }

  // ---------------- attacks ----------------
  *seedSpit(): Attack {
    this.warn(0.7);
    yield 0.7;
    const n = 2 + this.phase,
      p = this.fight.player;
    for (let i = 0; i < n; i++) {
      this.spit(clamp(p.x + p.vx * 0.3, 40, ARENA_R), 1.1 - this.phase * 0.08);
      yield 0.34 / this.speedMul;
    }
    this.endAttack();
  }

  *petalFan(): Attack {
    this.warn(0.6);
    yield 0.6;
    const volleys = this.phase === 3 ? 2 : 1,
      count = 4 + this.phase,
      spread = 0.75;
    for (let v = 0; v < volleys; v++) {
      const p = this.fight.player,
        sx = this.x - 40,
        sy = this.y,
        base = Math.atan2(p.y - 24 - sy, p.x - sx),
        s = 250 * this.speedMul;
      for (let i = 0; i < count; i++) {
        // the second volley is offset by half a gap, so it covers the lanes the first one left open
        const a = base + (i / (count - 1) - 0.5) * spread + (v ? spread / (count - 1) / 2 : 0);
        this.fight.projectiles.push(
          new Projectile({
            x: sx,
            y: sy,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            r: 10,
            owner: 'boss',
            kind: 'petal',
            life: 5,
          }),
        );
      }
      this.puff = 0.8;
      this.fight.emit({ type: 'petals' });
      yield 0.55;
    }
    this.endAttack();
  }

  *vineSweep(): Attack {
    this.warn(0.4);
    yield 0.4;
    this.fight.hazards.push(new VineSweep(340 + this.phase * 40)); // has its own rumble warning
    yield 1.4;
    if (this.phase === 3) {
      this.warn(0.5);
      yield 0.5;
      this.spit(clamp(this.fight.player.x, 40, ARENA_R), 1.0);
    }
    yield 1.2;
    this.endAttack();
  }

  *pollenRain(): Attack {
    this.warn(0.5);
    yield 0.5;
    const n = 3 + this.phase,
      p = this.fight.player;
    for (let i = 0; i < n; i++) {
      const x = i === 0 ? clamp(p.x, 60, 700) : this.fight.rng.range(60, 700);
      this.fight.hazards.push(new PollenDrop(x, i * 0.25));
    }
    this.puff = 0.8;
    yield 1.6 + n * 0.25;
    this.endAttack();
  }

  *rootPop(): Attack {
    this.warn(0.5);
    yield 0.5;
    for (let i = 0; i < 3; i++) {
      const p = this.fight.player;
      this.fight.hazards.push(new RootSpike(clamp(p.x + p.vx * 0.35, 40, 700)));
      yield 0.85;
    }
    yield 0.8;
    this.endAttack();
  }
}
