// The game's one version number, shown in Credits. release-please sets it (see "Versions" in the README).
import { describe, expect, it } from 'vitest';
import { version } from '../package.json';
import changelog from '../CHANGELOG.md?raw';

describe('the version', () => {
  it('is major.minor.patch', () => {
    expect(version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  });

  it('has its entry in the changelog, which release-please writes as it sets the version', () => {
    expect(changelog).toMatch(new RegExp(`^## \\[?${version.replaceAll('.', '\\.')}\\]?[ (]`, 'm'));
  });
});
