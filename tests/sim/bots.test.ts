// Whole fights played by simple bots, compared with the same bots playing the original game.
import { expect, it } from 'vitest';
import { Fight } from '../../src/sim/fight';
import { NO_INPUT } from '../../src/sim/input';
import baseline from '../fixtures/legacy-baseline.json';

// Damage dealt: an invulnerable Pip parks where diagonal shots hit Sunny's face.
function turret(seed: number) {
  const fight = new Fight({ seed });
  for (let f = 0; f < 60 * 180 && fight.state === 'play'; f++) {
    fight.player.inv = 999;
    const parked = fight.player.x >= 560;
    fight.step({ ...NO_INPUT, right: !parked, shoot: parked, up: parked });
  }
  return fight;
}

// Damage taken: Pip stands still until he is out of hearts. Returns the time he lasted.
function idle(seed: number, phase: number) {
  const fight = new Fight({ seed });
  fight.boss.phase = phase; // nothing hits the boss here, so the phase stays as set
  for (let f = 0; f < 60 * 300 && fight.state === 'play'; f++) fight.step(NO_INPUT);
  return fight.fightTime;
}
const meanIdle = (phase: number, n = 200) => {
  let sum = 0;
  for (let seed = 1; seed <= n; seed++) sum += idle(seed, phase);
  return sum / n;
};

it('takes the same time to win when every shot hits the face', () => {
  for (const [i, expected] of baseline.turret.entries()) {
    const fight = turret(i + 1);
    expect(fight.state).toBe('ending');
    expect(fight.fightTime).toBeCloseTo(expected.fightTime, 4);
    expect(fight.faceHits).toBe(expected.faceHits);
    expect(fight.player.x).toBeCloseTo(expected.x, 4);
  }
});

// The original draws its random numbers in a different order, so single fights can't match; averages can.
it('wears an idle Pip down about as fast in phase 1', () => {
  expect(Math.abs(meanIdle(1) - baseline.idlePhase1.mean)).toBeLessThan(0.75);
});
it('wears an idle Pip down about as fast in phase 3', () => {
  expect(Math.abs(meanIdle(3) - baseline.idlePhase3.mean)).toBeLessThan(2);
});
