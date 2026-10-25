// The title's own art: the logo, in parts that can drop in and grow one by one. Pip's yard around it is the
// garden path's (stage/art.ts) and the arena's sky (world/sky.ts), so the title looks like the game it opens.
// Everything here is baked inside bakeApart('title', ...): nothing else draws it.
import type { Scene } from 'phaser';
import { LEAF_LINE } from '../../art/color';
import { bake, bakeApart } from '../../art/bake';
import { FONT, linear, type Ctx, type Stops } from '../../art/draw';

// The logo is drawn in its own units (it began as an SVG 460 wide and 168 tall) and baked this many logical
// pixels to the unit. Its parts are placed around the middle of that box (LOGO_PARTS); the whole logo leans
// back a little (LOGO_TILT), as a sticker slapped on.
export const LOGO_S = 1.25;
export const LOGO_TILT = (-3 * Math.PI) / 180;
const GREEN: Stops = [
  [0, '#f1ffb0'],
  [0.55, '#a9ec62'],
  [1, '#63c245'],
];
const GOLD: Stops = [
  [0, '#fff7a8'],
  [0.5, '#ffd23f'],
  [1, '#ff9a2e'],
];
// Each part's (0, 0), from the logo's middle, in logical pixels: a line's is the middle of its baseline, the
// stalk's is its foot, and the leaves' is where they join the stalk.
export const LOGO_PARTS = {
  line1: { x: 0, y: -14 * LOGO_S },
  line2: { x: 0, y: 55 * LOGO_S },
  stalk: { x: -144 * LOGO_S, y: -36 * LOGO_S },
  leaves: { x: -143 * LOGO_S, y: -56 * LOGO_S },
};
const STALK = 'M0 22 Q-2 10 1 0';
const LEAF_L = 'M1 2 C-8 -14 -26 -12 -30 -2 C-20 6 -6 8 1 2Z';
const LEAF_R = 'M1 2 C8 -16 28 -16 33 -5 C24 6 8 8 1 2Z';

// One line of the logo: a dark copy dropped under it for depth, then the line itself, outlined and filled
// with a gradient from its top to its bottom. (0, 0) is the middle of its baseline.
function logoLine(
  c: Ctx,
  text: string,
  size: number,
  drop: number,
  outline: number,
  shade: string,
  edge: string,
  fill: Stops,
) {
  c.scale(LOGO_S, LOGO_S);
  c.font = `700 ${size}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.strokeStyle = c.fillStyle = shade;
  c.lineWidth = outline + 2;
  c.strokeText(text, 0, drop);
  c.fillText(text, 0, drop);
  c.strokeStyle = edge;
  c.lineWidth = outline;
  c.strokeText(text, 0, 0);
  c.fillStyle = linear(c, 0, -size * 0.78, 0, size * 0.12, fill);
  c.fillText(text, 0, 0);
}

function logoLeaf(c: Ctx, d: string, fill: string) {
  c.scale(LOGO_S, LOGO_S);
  c.translate(-1, -2); // the leaf's (0, 0) is where it joins the stalk
  const shape = new Path2D(d);
  c.fillStyle = fill;
  c.fill(shape);
  c.strokeStyle = LEAF_LINE;
  c.lineWidth = 3.5;
  c.stroke(shape);
}

export function bakeTitle(scene: Scene) {
  bakeApart('title', () => {
    const S = LOGO_S;
    bake(scene, 'logo-line1', 420 * S, 84 * S, 210 * S, 56 * S, (c) =>
      logoLine(c, 'Sprout & the', 50, 6, 10, '#134a20', '#1c5f2a', GREEN),
    );
    bake(scene, 'logo-line2', 520 * S, 104 * S, 260 * S, 66 * S, (c) =>
      logoLine(c, 'Grumpy Garden', 68, 7, 12, '#4a2206', '#6b3408', GOLD),
    );
    bake(scene, 'logo-stalk', 16 * S, 32 * S, 8 * S, 27 * S, (c) => {
      c.scale(S, S);
      c.translate(0, -22); // the stalk's (0, 0) is its foot
      const stalk = new Path2D(STALK);
      c.strokeStyle = '#1c5f2a';
      c.lineWidth = 7;
      c.stroke(stalk);
      c.strokeStyle = '#7fd65a';
      c.lineWidth = 3;
      c.stroke(stalk);
    });
    bake(scene, 'logo-leaf-l', 38 * S, 28 * S, 34 * S, 16 * S, (c) => logoLeaf(c, LEAF_L, '#8ee05f'));
    bake(scene, 'logo-leaf-r', 40 * S, 28 * S, 4 * S, 18 * S, (c) => logoLeaf(c, LEAF_R, '#b6f07c'));
  });
}
