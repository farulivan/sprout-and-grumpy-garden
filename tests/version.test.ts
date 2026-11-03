// The game's one version number, shown in Credits. See "Versions" in the README for what its parts mean.
import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import readme from '../README.md?raw';

describe('the version', () => {
  it('is major.minor.patch', () => {
    expect(version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  });

  it("is in the README's list of versions, so that a release can't forget it", () => {
    expect(readme).toContain(`| \`v${version}\` |`);
  });
});
