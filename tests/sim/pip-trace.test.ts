// Pip must move exactly as in the original vanilla-JS game: the fixture holds the original's per-frame
// inputs and the positions they produced. See the README ("Tests") for where the fixture came from.
import { expect, it } from 'vitest';
import { STEP } from '../../src/config';
import { Fight } from '../../src/sim/fight';
import baseline from '../fixtures/legacy-baseline.json';

it('replays the original movement trace', () => {
  const { inputs, hurtFrames, states, shots } = baseline.pipTrace;
  const fight = new Fight({ seed: 1 });
  const p = fight.player;
  const mismatches: string[] = [];
  const newShots: number[][] = [];
  let prevJump = false;

  for (let f = 0; f < inputs.length; f++) {
    if (hurtFrames.includes(f)) p.hurt();
    const m = inputs[f]; // bits: left, right, up, jump, shoot
    const jump = !!(m & 8);
    p.update(STEP, {
      left: !!(m & 1),
      right: !!(m & 2),
      up: !!(m & 4),
      jump,
      shoot: !!(m & 16),
      jumpPressed: jump && !prevJump,
    });
    prevJump = jump;
    for (const pr of fight.projectiles) newShots.push([f, pr.x, pr.y, pr.vx, pr.vy]);
    fight.projectiles.length = 0;

    const now = [p.x, p.y, p.vx, p.vy, p.onGround ? 1 : 0];
    if (now.some((v, i) => Math.abs(v - states[f][i]) > 1e-5) && mismatches.length < 3)
      mismatches.push(`frame ${f}: expected ${states[f]} got ${now.map((v) => +v.toFixed(6))}`);
  }

  expect(mismatches).toEqual([]);
  expect(newShots.length).toBe(shots.length);
  newShots.forEach((s, i) => s.forEach((v, j) => expect(v).toBeCloseTo(shots[i][j], 4)));
});
