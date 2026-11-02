// The Mushroom Wood as a StageWorldView draws it. So far this is a placeholder: the Garden Path's landscape
// under the darkening weather it already has, with only the wood's own pieces (wood/art.ts) drawn new, so that
// the stage can be played before its art is.
import { GARDEN_THEME } from '../stage/gardenTheme';
import type { StageTheme } from '../stage/StageWorldView';
import { WOOD_BLOOMS } from './art';

export const WOOD_THEME: StageTheme = {
  ...GARDEN_THEME,
  home: undefined, // Pip's cottage is far behind him now
  trunk: 'wood-trunk',
  bramble: 'wood-bramble',
  pad: (w) => `wood-pad-${w}`,
  stalk: (drop) => `wood-stalk-${drop}`,
  sign: 'wood-sign',
  gate: 'wood-gate',
  bloom: (i) => `wood-bloom-${i % WOOD_BLOOMS}`,
  mood: (progress) => (progress < 0.55 ? 'grumpy' : 'stormy'), // dusk, going on to deeper dusk
};
