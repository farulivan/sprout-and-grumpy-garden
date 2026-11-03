// The game's one version number, shown in Credits. See "Versions" in the README for what its parts mean.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { version } from '../package.json';

describe('the version', () => {
  it('is major.minor.patch', () => {
    expect(version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  });

  it("is in the README's list of versions, so that a release can't forget it", () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    expect(readme).toContain(`| \`v${version}\` |`);
  });
});
