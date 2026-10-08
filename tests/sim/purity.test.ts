// The simulation must stay free of the engine, the browser and unseeded randomness, so it keeps running
// in these tests and fights stay reproducible. (src/sim/tsconfig.json also compiles it without DOM types.)
import { expect, it } from 'vitest';

const sources = import.meta.glob('../../src/sim/**/*.ts', { query: '?raw', import: 'default', eager: true });

it('has no Phaser, DOM or Math.random in src/sim', () => {
  const offenders: string[] = [];
  for (const [file, text] of Object.entries(sources as Record<string, string>)) {
    const code = text.replace(/\/\/.*$/gm, '');
    for (const banned of [
      "from 'phaser'",
      'Math.random',
      'document.',
      'window.',
      'performance.now',
      'Date.now',
    ])
      if (code.includes(banned)) offenders.push(`${file}: ${banned}`);
  }
  expect(Object.keys(sources).length).toBeGreaterThan(8);
  expect(offenders).toEqual([]);
});
