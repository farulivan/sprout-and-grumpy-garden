// Mo the Moody Mushroom (src/sim/bosses/mo.ts): how he can be hurt, that every attack warns first, that he can't pin
// Pip, and that the fight has no safe spot.
import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/config';
import { CAP_RX, Mo, MO_LEFT, MO_PLATFORMS, MO_RIGHT } from '../../src/sim/bosses/mo';
import type { SimEvent } from '../../src/sim/events';
import { Fight } from '../../src/sim/fight';
import { NO_INPUT, type InputFrame } from '../../src/sim/input';
import { Projectile } from '../../src/sim/projectile';

const ATTACKS = ['bigHop', 'gloomCloud', 'sporePuffs', 'sproutCaplings', 'capSpin'];

function fightMo(seed = 3) {
  const fight = new Fight({ seed, boss: 'mo' }),
    mo = fight.boss as Mo;
  mo.state = 'fight'; // skip the intro
  mo.introT = 2;
  return { fight, mo };
}
type Input = InputFrame | (() => InputFrame);
function run(fight: Fight, seconds: number, input: Input = NO_INPUT) {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    fight.step(typeof input === 'function' ? input() : input);
    events.push(...fight.drainEvents());
  }
  return events;
}
const seedAt = (x: number, y: number) =>
  new Projectile({ x, y, vx: 0, vy: 0, r: 7, owner: 'player', kind: 'sprout', life: 1 });
const has = (events: SimEvent[], type: SimEvent['type']) => events.some((e) => e.type === type);
// A seed placed right here: what it does to him.
function shootAt(fight: Fight, x: number, y: number) {
  fight.projectiles.push(seedAt(x, y));
  fight.step(NO_INPUT);
  return fight.drainEvents();
}
const rearUp = (fight: Fight, mo: Mo) => {
  mo.startAttack('sporePuffs');
  run(fight, 0.5);
  expect(mo.faceOpen).toBe(true);
};

describe('how Mo can be hurt', () => {
  it('bounces seeds off his cap while he sulks, and his stalk takes normal damage', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = 100;
    const onCap = shootAt(fight, mo.x + 60, mo.capY);
    expect(has(onCap, 'bossBlock')).toBe(true);
    expect(mo.hp).toBe(mo.maxHp);
    const onStalk = shootAt(fight, mo.x, GROUND - 30);
    expect(onStalk.find((e) => e.type === 'bossHit')).toMatchObject({ weak: false });
    expect(mo.hp).toBe(mo.maxHp - 1);
  });

  it('opens his face for double damage as he rears up to attack, and not otherwise', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = 100;
    expect(mo.faceOpen).toBe(false);
    rearUp(fight, mo);
    const hp = mo.hp,
      events = shootAt(fight, mo.x, mo.faceY);
    expect(events.find((e) => e.type === 'bossHit')).toMatchObject({ weak: true });
    expect(mo.hp).toBe(hp - 2);
  });

  it('can have his face hit by a seed aimed up from the ground, without any jump', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = mo.x - 150;
    rearUp(fight, mo);
    const events = run(fight, 0.6, { ...NO_INPUT, shoot: true, up: true });
    expect(events.some((e) => e.type === 'bossHit' && e.weak)).toBe(true);
    expect(fight.player.y).toBe(GROUND);
  });

  it('can have his face hit by a straight seed during a jump, without any aiming', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = mo.x - 200;
    rearUp(fight, mo);
    let f = 0;
    const events = run(fight, 0.7, () => ({
      ...NO_INPUT,
      shoot: true,
      jump: true,
      jumpPressed: f++ === 0,
    }));
    expect(events.some((e) => e.type === 'bossHit' && e.weak)).toBe(true);
  });

  it('hurts to touch, but his cap throws Pip clear while he sulks', () => {
    const touched = fightMo();
    touched.fight.player.x = touched.fight.player.px = touched.mo.x - 20;
    expect(has(run(touched.fight, 0.1), 'playerHurt')).toBe(true);

    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = mo.x + 20;
    fight.player.y = fight.player.py = mo.capTop - 40;
    const events = run(fight, 0.4);
    expect(has(events, 'bounce')).toBe(true);
    expect(has(events, 'playerHurt')).toBe(false);
    expect(fight.player.vy).toBeLessThan(0);
  });

  it('turns seeds away while he whirls', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = 60;
    fight.player.inv = 99;
    mo.startAttack('capSpin');
    run(fight, 1);
    expect(mo.spinning).toBe(true);
    const hp = mo.hp;
    expect(has(shootAt(fight, mo.x, GROUND - 40), 'bossBlock')).toBe(true);
    expect(mo.hp).toBe(hp);
  });
});

describe("Mo's attacks", () => {
  for (const name of ATTACKS)
    it(`${name} shows its "!" before anything can hurt`, () => {
      const { fight, mo } = fightMo();
      fight.player.x = fight.player.px = 300;
      fight.player.inv = 999;
      mo.phase = 3;
      mo.startAttack(name);
      // the same step as the warning: the "!" is up, and nothing is out yet that can hurt
      fight.step(NO_INPUT);
      const events = fight.drainEvents();
      expect(has(events, 'telegraph')).toBe(true);
      expect(mo.telegraph).toBeGreaterThan(0);
      const hazards = () => fight.hazards.filter((h) => h.shape() !== null);
      for (let i = 0; i < 20; i++) {
        expect(hazards()).toEqual([]);
        fight.step(NO_INPUT);
      }
      // and what comes later warns for itself as it arrives
      for (let i = 0; i < 60 * 12 && mo.attacking; i++) {
        const hazards = new Set(fight.hazards),
          enemies = new Set(fight.enemies);
        fight.step(NO_INPUT);
        for (const h of fight.hazards) if (!hazards.has(h)) expect(h.shape()).toBeNull();
        for (const e of fight.enemies)
          if (e.kind === 'capling' && !enemies.has(e)) expect(e.entering).toBeGreaterThan(0);
      }
    });

  it('uses only Big Hop and Gloom Cloud at first, and adds the rest with each phase', () => {
    const seen = (phase: number) => {
      const names = new Set<string>();
      for (let seed = 1; seed <= 8; seed++) {
        const { fight, mo } = fightMo(seed);
        fight.player.x = fight.player.px = 300;
        mo.phase = phase;
        for (let i = 0; i < 60 * 30; i++) {
          fight.player.inv = 999;
          fight.step(NO_INPUT);
          if (mo.attackName) names.add(mo.attackName);
        }
      }
      return [...names].sort();
    };
    expect(seen(1)).toEqual(['bigHop', 'gloomCloud']);
    expect(seen(2)).toEqual(['bigHop', 'gloomCloud', 'sporePuffs', 'sproutCaplings']);
    expect(seen(3)).toEqual([...ATTACKS].sort());
  });

  it('never comes down on a Pip who stands still, wherever he is', () => {
    for (const x of [24, 200, 480, 760, 936])
      for (let seed = 1; seed <= 6; seed++) {
        const { fight, mo } = fightMo(seed);
        fight.player.x = fight.player.px = x;
        mo.phase = 3;
        for (let i = 0; i < 60 * 25; i++) {
          fight.player.inv = 999;
          fight.step(NO_INPUT);
          if (mo.landX !== null) expect(Math.abs(mo.landX - x), `Pip at ${x}`).toBeGreaterThan(CAP_RX + 14);
        }
      }
  });

  it("can't pin Pip: at either end of his range, there's room at the wall", () => {
    for (const [x, wall] of [
      [MO_LEFT, 24],
      [MO_RIGHT, 936],
    ]) {
      const { fight, mo } = fightMo();
      mo.x = mo.px = x;
      fight.player.x = fight.player.px = wall;
      run(fight, 0.1);
      expect(mo.touches(fight.player.hitbox)).toBe(false);
    }
  });

  it('lets a Pip against the wall get over him by bouncing on his cap', () => {
    const { fight, mo } = fightMo();
    mo.x = mo.px = MO_LEFT;
    mo.state = 'paused'; // he only sits there
    fight.player.x = fight.player.px = 24;
    let f = 0;
    const events = run(fight, 2.2, () => ({
      ...NO_INPUT,
      right: true,
      jump: true,
      jumpPressed: f++ === 0,
    }));
    expect(has(events, 'bounce')).toBe(true);
    expect(has(events, 'playerHurt')).toBe(false);
    expect(fight.player.x).toBeGreaterThan(mo.x);
  });

  it('rains through a shelf: Gloom Cloud reaches Pip on one', () => {
    const shelf = MO_PLATFORMS[0],
      { fight, mo } = fightMo();
    fight.player.x = fight.player.px = shelf.x + shelf.w / 2;
    fight.player.y = fight.player.py = shelf.y;
    fight.player.onGround = true;
    mo.startAttack('gloomCloud');
    expect(has(run(fight, 5), 'playerHurt')).toBe(true);
    expect(fight.player.y).toBeLessThanOrEqual(GROUND);
  });

  it('makes bounce pads of his Caplings that wilt, and his Caplings wilt if left alone', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = 300;
    fight.player.inv = 999;
    mo.startAttack('sproutCaplings');
    run(fight, 2);
    const capling = fight.enemies.find((e) => e.kind === 'capling')!;
    expect(capling).toBeDefined();
    capling.hp = 1;
    fight.projectiles.push(seedAt(capling.x, capling.y - 20));
    const events = run(fight, 0.1);
    expect(has(events, 'padReady')).toBe(true);
    expect(fight.pads.length).toBe(1);
    expect(fight.bouncers).toContain(fight.pads[0]);
    (mo as unknown as { idle: number }).idle = 1e6;
    run(fight, 8);
    expect(fight.pads.length).toBe(0);
    expect(fight.enemies.filter((e) => e.kind === 'capling').length).toBe(0);
  });

  it('pops spore bubbles on a seed or on Pip', () => {
    const { fight, mo } = fightMo();
    fight.player.x = fight.player.px = 300;
    mo.startAttack('sporePuffs');
    run(fight, 0.9);
    const bubble = fight.enemies[0];
    expect(bubble.kind).toBe('spore');
    fight.projectiles.push(seedAt(bubble.x, bubble.y));
    expect(has(run(fight, 0.05), 'enemyCheered')).toBe(true);
    const hits = run(fight, 12);
    expect(has(hits, 'enemyBurst')).toBe(true);
    expect(has(hits, 'playerHurt')).toBe(true);
  });

  it('runs its second phase at 66% and third at 33%, with its dewdrop', () => {
    const { fight, mo } = fightMo();
    fight.player.inv = 999;
    mo.hit(mo.maxHp * 0.34 - 1);
    expect(mo.phase).toBe(1);
    mo.hit(1);
    expect(mo.phase).toBe(2);
    expect(fight.pickups.length).toBe(1);
  });
});

describe('the fight', () => {
  it('replays identically from the same seed and inputs', () => {
    const play = () => {
      const fight = new Fight({ seed: 12, boss: 'mo' });
      let f = 0;
      for (let i = 0; i < 60 * 60 && fight.state === 'play'; i++) {
        fight.step({
          ...NO_INPUT,
          shoot: true,
          up: f % 120 < 40,
          left: f % 300 < 100,
          right: f % 300 > 200,
          jump: f % 70 < 20,
          jumpPressed: f++ % 70 === 0,
        });
        fight.drainEvents();
      }
      return [fight.fightTime, fight.player.x, fight.player.hp, fight.boss.hp, fight.boss.x, fight.state];
    };
    expect(play()).toEqual(play());
  });

  // Plants itself anywhere, on the ground or a shelf, holds shoot at him, and hops under every "!".
  function turret(seed: number, x: number, y: number, aim: boolean) {
    const fight = new Fight({ seed, boss: 'mo' }),
      p = fight.player;
    p.x = p.px = x;
    p.y = p.py = y;
    let was = 0;
    for (let i = 0; i < 60 * 180 && fight.state === 'play'; i++) {
      p.x = x; // it doesn't leave, whatever knocks it
      p.facing = fight.boss.x < x ? -1 : 1;
      const warned = fight.boss.telegraph > was && p.onGround;
      was = fight.boss.telegraph;
      fight.step({ ...NO_INPUT, shoot: true, up: aim, jump: warned, jumpPressed: warned });
      fight.drainEvents();
    }
    return fight;
  }

  it('has no safe spot: planted anywhere, holding shoot and hopping at each "!", Pip nearly always loses', () => {
    const spots: [number, number][] = [
      [30, GROUND],
      [150, GROUND],
      [300, GROUND],
      [480, GROUND],
      [660, GROUND],
      [810, GROUND],
      [930, GROUND],
      ...MO_PLATFORMS.map((p): [number, number] => [p.x + p.w / 2, p.y]),
    ];
    let wins = 0,
      played = 0;
    for (const [x, y] of spots)
      for (const aim of [false, true])
        for (let seed = 1; seed <= 6; seed++) {
          const fight = turret(seed, x, y, aim);
          played++;
          if (fight.state === 'ending' || fight.state === 'win') wins++;
          // a fight that hasn't ended counts against the spot being safe only if Pip is unhurt at the end
          else expect(fight.state === 'lose' || fight.player.hits > 0, `spot ${x}`).toBe(true);
        }
    expect(wins / played).toBeLessThan(0.05);
  });
});
