// Each attack must spawn the same things at the same moments as in the original, in every phase.
// Pip is parked at x=300 and invulnerable, so only the boss's own code decides what appears.
import { describe, expect, it } from 'vitest';
import { Fight } from '../../src/sim/fight';
import { NO_INPUT } from '../../src/sim/input';
import baseline from '../fixtures/legacy-baseline.json';

type Spawn = (string | number)[]; // [frame, kind, x, y, vx, vy, speed-or-warn]

function attackLog(name: string, phase: number): Spawn[] {
  const fight = new Fight({ seed: 7 });
  const boss = fight.boss;
  boss.state = 'fight';
  boss.phase = phase;
  fight.player.x = 300;
  boss.startAttack(name);
  const seen = new Set<object>();
  const log: Spawn[] = [];
  for (let step = 0; step < 60 * 10 && boss.attacking; step++) {
    fight.player.inv = 999;
    fight.step(NO_INPUT);
    for (const e of [...fight.projectiles, ...fight.hazards]) {
      if (seen.has(e)) continue;
      seen.add(e);
      // projectiles have a velocity; hazards have a speed (vine) or a warning timer (root, pollen)
      const f = e as { vx?: number; vy?: number; speed?: number; warn?: number };
      log.push([step, e.kind, e.x, e.y, f.vx ?? 0, f.vy ?? 0, f.speed ?? f.warn ?? 0]);
    }
  }
  return log;
}

describe('attack patterns match the original', () => {
  for (const [key, expected] of Object.entries(baseline.attacks)) {
    it(key, () => {
      const [name, phase] = key.split('@');
      const log = attackLog(name, Number(phase));
      expect(log.map((s) => `${s[0]} ${s[1]}`)).toEqual(expected.map((s) => `${s[0]} ${s[1]}`));
      let pollen = 0;
      log.forEach((spawn, i) => {
        // every pollen ball after the first lands on a random spot
        const randomX = spawn[1] === 'pollen' && pollen++ > 0;
        for (let j = 2; j < spawn.length; j++) {
          if (j === 2 && randomX) {
            expect(spawn[j]).toBeGreaterThanOrEqual(60);
            expect(spawn[j]).toBeLessThanOrEqual(700);
          } else if (expected[i][j] !== null) {
            // null = a field the original object did not have (its root spike had no y)
            expect(spawn[j]).toBeCloseTo(expected[i][j] as number, 4);
          }
        }
      });
    });
  }
});
