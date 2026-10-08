// The rules of a fight that the README promises players.
import { describe, expect, it } from 'vitest';
import { Fight } from '../../src/sim/fight';
import { NO_INPUT } from '../../src/sim/input';
import type { SimEvent } from '../../src/sim/events';

const steps = (fight: Fight, seconds: number) => {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    fight.step(NO_INPUT);
    events.push(...fight.drainEvents());
  }
  return events;
};
const fighting = (opts = {}) => {
  const fight = new Fight({ seed: 3, ...opts });
  fight.boss.state = 'fight'; // skip the intro
  return fight;
};

describe('boss', () => {
  it('ignores hits during the intro, then starts fighting after 1.7 s', () => {
    const fight = new Fight({ seed: 3 });
    expect(fight.boss.hit(5)).toBe(false);
    const events = steps(fight, 1.8).map((e) => e.type);
    expect(events).toContain('introRoar');
    expect(events).toContain('fightStart');
    expect(fight.boss.state).toBe('fight');
  });

  it('changes phase at 66% and 33% health', () => {
    const fight = fighting();
    const boss = fight.boss;
    boss.hit(boss.maxHp * 0.34 - 1);
    expect(boss.phase).toBe(1);
    boss.hit(1);
    expect(boss.phase).toBe(2);
    boss.inv = 0;
    boss.hit(boss.maxHp * 0.33);
    expect(boss.phase).toBe(3);
  });

  it('is invulnerable for 1.4 s and drops a dewdrop when the phase changes', () => {
    const fight = fighting();
    const boss = fight.boss;
    boss.hit(boss.maxHp * 0.34);
    expect(fight.pickups.length).toBe(1);
    expect(fight.drainEvents().some((e) => e.type === 'phase')).toBe(true);
    const hp = boss.hp;
    expect(boss.hit(10)).toBe(false);
    fight.player.inv = 999;
    steps(fight, 1.45);
    expect(boss.hit(10)).toBe(true);
    expect(boss.hp).toBe(hp - 10);
  });

  it('always warns before an attack', () => {
    const fight = fighting();
    fight.player.inv = 999;
    const events = steps(fight, 1.3).map((e) => e.type);
    expect(events).toContain('telegraph');
    expect(fight.projectiles.length + fight.hazards.length).toBe(0); // still only the warning
  });

  it('never repeats the same attack twice in a row', () => {
    const fight = fighting();
    const boss = fight.boss as unknown as { lastAttack: string };
    const picked: string[] = [];
    for (let i = 0; i < 60 * 60; i++) {
      fight.player.inv = 999;
      fight.step(NO_INPUT);
      if (picked[picked.length - 1] !== boss.lastAttack) picked.push(boss.lastAttack);
    }
    expect(picked.length).toBeGreaterThan(10);
    // phase 1 has two attacks, so they must strictly alternate
    expect(picked.every((name, i) => i === 0 || name !== picked[i - 1])).toBe(true);
  });
});

describe('fight', () => {
  it('gives 5 hearts, or 8 in easy mode', () => {
    expect(new Fight({ seed: 1 }).player.hp).toBe(5);
    const easy = new Fight({ seed: 1, easy: true }).player;
    expect([easy.hp, easy.maxHp]).toEqual([8, 8]);
  });

  it('protects Pip for 1.6 s after a hit', () => {
    const fight = fighting();
    const pip = fight.player;
    expect(pip.hurt()).toBe(true);
    expect(pip.hurt()).toBe(false);
    expect(pip.hp).toBe(4);
    pip.inv = 0;
    expect(pip.hurt()).toBe(true);
  });

  it('heals one heart from a dewdrop, never above the maximum', () => {
    const fight = fighting();
    const pip = fight.player;
    pip.hp = 3;
    fight.boss.hit(fight.boss.maxHp * 0.34);
    const drop = fight.pickups[0];
    drop.x = pip.x;
    drop.y = pip.y - 20;
    fight.step(NO_INPUT);
    expect(pip.hp).toBe(4);
    expect(fight.pickups.length).toBe(0);
  });

  it('wins with stars for hits taken, after a slow-motion bloom', () => {
    const fight = fighting();
    fight.player.hits = 2;
    fight.boss.hit(fight.boss.maxHp);
    expect(fight.state).toBe('ending');
    expect(fight.timeScale).toBe(0.25);
    const events = steps(fight, 4.6);
    expect(fight.state).toBe('win');
    const win = events.find((e) => e.type === 'win');
    expect(win && win.type === 'win' && win.result.stars).toBe(2);
    expect(events.some((e) => e.type === 'confetti')).toBe(true);
  });

  it('loses when Pip runs out of hearts, reporting progress', () => {
    const fight = fighting();
    fight.boss.hit(100); // 25% of 400
    for (let i = 0; i < 5; i++) {
      fight.player.inv = 0;
      fight.player.hurt();
    }
    const events = steps(fight, 2.4);
    expect(fight.state).toBe('lose');
    expect(events.find((e) => e.type === 'lose')).toEqual({ type: 'lose', progress: 25 });
    expect(fight.boss.attacking).toBe(false);
  });

  it('does nothing but sway on the title screen', () => {
    const fight = new Fight({ seed: 1, title: true });
    steps(fight, 5);
    expect(fight.state).toBe('title');
    expect(fight.boss.state).toBe('sleep');
    expect(fight.projectiles.length + fight.hazards.length).toBe(0);
  });

  it('replays identically from the same seed', () => {
    const run = () => {
      const fight = new Fight({ seed: 42 });
      for (let i = 0; i < 60 * 20 && fight.state === 'play'; i++) fight.step(NO_INPUT);
      return [fight.fightTime, fight.player.x, fight.player.hp, fight.boss.x];
    };
    expect(run()).toEqual(run());
  });
});
