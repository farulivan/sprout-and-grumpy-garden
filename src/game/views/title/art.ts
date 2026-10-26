// The title's own art: the studio's sting, the logo in parts that can drop in and grow one by one, the
// cottage's door, and the stars of the dawn. (The iris that opens the dawn is views/Iris.ts.) Pip's yard around it is the garden path's (stage/art.ts) and the
// arena's sky (world/sky.ts), so the title looks like the game it opens. Everything here is baked inside
// bakeApart('title', ...): nothing else draws it.
import type { Scene } from 'phaser';
import { LEAF_LINE, PIP_LINE } from '../../art/color';
import { bake, bakeApart } from '../../art/bake';
import { circle, FONT, glow, line, linear, radial, sparkle, type Ctx, type Stops } from '../../art/draw';

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
    bakeTitleScenery(scene);
  });
}

// ---- the studio's sting: "farulivan presents", the seed landing on the i and sprouting as its dot ----
const STING_NAME = 'farulıvan'; // a dotless i: the sprout is its dot
export const STING_SIZE = 92;
export const STING_SPROUT = 1.8; // the sprout over the i, against the logo's
interface Letter {
  key: string;
  x: number; // the middle of its baseline, from the middle of the word
}
// The letters of the name, each a part of its own so they can pop in one after another, and where the i
// stands. Measured once the font has loaded (BootScene waits for it).
export const STING: { letters: Letter[]; iX: number; width: number } = { letters: [], iX: 0, width: 0 };

function measure(text: string, font: string) {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return text.length * 40;
  c.font = font;
  return c.measureText(text).width;
}

function stingLetter(c: Ctx, ch: string) {
  c.font = `700 ${STING_SIZE}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.strokeStyle = c.fillStyle = '#134a20';
  c.lineWidth = 15;
  c.strokeText(ch, 0, 7);
  c.fillText(ch, 0, 7);
  c.strokeStyle = LEAF_LINE;
  c.lineWidth = 13;
  c.strokeText(ch, 0, 0);
  c.fillStyle = linear(c, 0, -STING_SIZE * 0.78, 0, STING_SIZE * 0.12, GREEN);
  c.fillText(ch, 0, 0);
}

// Pip's seed, as he shoots it (ProjectileViews), pointing down: it falls onto the i.
function seed(c: Ctx, half: -1 | 0 | 1) {
  c.rotate(Math.PI / 2);
  const shape = () => {
    c.beginPath();
    c.moveTo(-13, 0);
    c.quadraticCurveTo(-4, -8.5, 3, -6.6);
    c.arc(1, 0, 6.8, -1.25, 1.25);
    c.quadraticCurveTo(-4, 8.5, -13, 0);
    c.closePath();
  };
  if (half) {
    // one half of the shell, split down its length
    c.beginPath();
    c.rect(-20, half < 0 ? -12 : 0, 40, 12);
    c.clip();
  }
  shape();
  c.fillStyle = radial(c, 0, 0, 12, ['#ffffff', '#dcff8e', '#86dc44'], 2, -2);
  c.fill();
  line(c, PIP_LINE, 2.4);
  if (half >= 0) {
    circle(c, 2.5, -2.6, 1.9);
    c.fillStyle = '#fff';
    c.fill();
  }
}

// The cottage's round green door, as stage/art.ts draws it, but hinged: (0, 0) is the foot of its hinge.
function door(c: Ctx) {
  const shape = () => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -36);
    c.arc(17, -36, 17, Math.PI, 0);
    c.lineTo(34, 0);
    c.closePath();
  };
  shape();
  c.fillStyle = linear(c, 0, 0, 34, 0, ['#6fcd4c', '#3f9d3a']);
  c.fill();
  shape();
  line(c, LEAF_LINE, 2.6);
  circle(c, 26, -24, 2.4);
  c.fillStyle = '#ffd23f';
  c.fill();
}

// Inside the open door: dark, with the warm light of the cottage on the floor. (0, 0) is the doorstep.
function doorway(c: Ctx) {
  const shape = () => {
    c.beginPath();
    c.moveTo(-17, 0);
    c.lineTo(-17, -36);
    c.arc(0, -36, 17, Math.PI, 0);
    c.lineTo(17, 0);
    c.closePath();
  };
  shape();
  c.fillStyle = linear(c, 0, -53, 0, 0, ['#2e1d12', '#5b3820', '#8a5a2e']);
  c.fill();
  c.save();
  shape();
  c.clip();
  glow(c, 0, 0, 24, '#ffcf7a', 0.75, 14);
  c.restore();
  shape();
  line(c, '#4a2a14', 2.6);
}

export function bakeTitleScenery(scene: Scene) {
  const font = `700 ${STING_SIZE}px ${FONT}`,
    chars = [...STING_NAME],
    widths = chars.map((ch) => measure(ch, font)),
    width = measure(STING_NAME, font),
    kern = (width - widths.reduce((a, b) => a + b, 0)) / Math.max(1, chars.length - 1);
  let x = -width / 2;
  STING.letters = [];
  chars.forEach((ch, i) => {
    const key = `sting-${i}`,
      w = widths[i];
    bake(scene, key, w + 30, STING_SIZE * 1.35, w / 2 + 15, STING_SIZE * 1.0, (c) => stingLetter(c, ch));
    STING.letters.push({ key, x: x + w / 2 });
    if (ch === 'ı') STING.iX = x + w / 2;
    x += w + kern;
  });
  STING.width = width;
  bake(scene, 'sting-presents', 240, 40, 120, 28, (c) => {
    c.font = `600 24px ${FONT}`;
    c.textAlign = 'center';
    c.fillStyle = '#9a7a52';
    const letters = [...'presents'],
      gap = 7,
      ws = letters.map((ch) => c.measureText(ch).width),
      total = ws.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
    let at = -total / 2;
    letters.forEach((ch, i) => {
      c.fillText(ch, at + ws[i] / 2, 0);
      at += ws[i] + gap;
    });
  });
  bake(scene, 'sting-seed', 24, 34, 12, 17, (c) => seed(c, 0));
  bake(scene, 'sting-seed-l', 24, 34, 12, 17, (c) => seed(c, -1));
  bake(scene, 'sting-seed-r', 24, 34, 12, 17, (c) => seed(c, 1));

  bake(scene, 'title-door', 40, 60, 3, 57, door);
  bake(scene, 'title-doorway', 40, 60, 20, 57, doorway);
  bake(scene, 'title-star', 18, 18, 9, 9, (c) => {
    glow(c, 0, 0, 9, '#fff6c8', 0.6);
    sparkle(c, 0, 0, 7);
    c.fillStyle = '#ffffff';
    c.fill();
  });
}
