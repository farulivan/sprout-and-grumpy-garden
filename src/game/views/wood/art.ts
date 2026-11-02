// The Mushroom Wood's world, drawn in code like everything else (see README "How it looks"): at dusk, with the
// last warm light low between the trees, far trunks going pale in the haze, giant mushrooms that glow, mossy
// ground, and the canopy overhead. Strips that repeat are drawn so their two ends meet. It is all baked on pages
// of its own the first time the chapter is played (see bakeLate), so nobody waits for it who hasn't got there.
// The weather darkens it further along the stage, so colours here are as they look at dusk.
import type { Scene } from 'phaser';
import { WOOD } from '../../../chapters';
import { GROUND, TAU } from '../../../config';
import { STAGES } from '../../../sim/stage/stages';
import { bake, SOFT } from '../../art/bake';
import { mix } from '../../art/color';
import {
  blade,
  circle,
  ellipse,
  FONT,
  glow,
  inside,
  leaf,
  line,
  linear,
  radial,
  roundRect,
  seeded,
  type Ctx,
  type Stops,
} from '../../art/draw';
import { drawFace } from '../../art/face';
import {
  drawGroundEnd,
  drawGroundStrip,
  drawLog,
  drawPit,
  drawThorns,
  GROUND_BOTTOM,
  GROUND_TOP,
  repeat,
  TILE,
  wave,
  type GroundLook,
} from '../stage/art';
import { MO_PLATFORMS } from '../../../sim/bosses/mo';
import { bakeWoodEnemies } from './enemyArt';
import { bakeMo } from '../mo/art';
import { bakeMoAttacks } from './moArt';

export const FOREST_P = 1920; // the far and middle trees repeat every this many pixels
export const NEAR_P = 1024; // ...the near ones
export const BRUSH_P = 720; // ...the undergrowth
export const CANOPY_P = 960; // ...and the leaves overhead
export const WOOD_BLOOMS = 3;
export const WOOD_DRESS = 6;
export const WOOD_TREES = 3;
export const WOOD_SHROOMS = 3;

const INK = '#1c1238'; // the outline of things in this light
const SHROOM_COLOURS: readonly (readonly [string, string, string, string])[] = [
  ['#c8fbff', '#58cfe8', '#2a7fb8', '#7feaff'], // cyan
  ['#fff2b4', '#f7bd4e', '#c9782a', '#ffdf7a'], // gold
  ['#ffd0f2', '#e87ad0', '#9c3a9e', '#ff9be8'], // pink
];

const MOSS: GroundLook = {
  soil: ['#55406a', '#3c2c54', '#281c3e'],
  seam: '#170f28',
  specks: ['rgba(160,140,200,0.4)', 'rgba(20,12,36,0.45)'],
  stone: ['#b2b1cf', '#73729c', '#4c4c74'],
  stoneShade: '#120b22',
  root: '#93a9ba',
  turfShade: 'rgba(18,10,34,0.62)',
  turfShadeOff: 'rgba(18,10,34,0)',
  bottomOff: 'rgba(10,6,24,0)',
  bottom: 'rgba(10,6,24,0.48)',
  blades: ['#2f8f78', '#3fa886', '#287a6c', '#58c49a'],
  turf: ['#7fe0ac', '#46b08a', '#2a7f72'],
  turfLit: 'rgba(180,250,208,0.6)',
  turfDark: 'rgba(18,84,84,0.6)',
  turfEdge: '#14524f',
  turfTop: '#d0ffe0',
  face: ['#584470', '#3e2e58', '#2a1e40'],
  faceShadeOff: 'rgba(14,8,28,0)',
  faceShade: 'rgba(14,8,28,0.55)',
  faceLine: '#1a1030',
  faceRoot: '#8c9cb2',
  lipBlades: ['#46b08a', '#2f8f78'],
  pit: ['#2c2148', '#191132', '#0a0618'],
  pitSpeck: 'rgba(110,90,160,0.3)',
  pitLip: 'rgba(6,3,14,0.72)',
  pitLipOff: 'rgba(6,3,14,0)',
};

// ---- mushrooms ----

// A mushroom standing on (0, 0), w wide and h tall: a stalk under a round cap, lit from the top left.
export function drawMushroom(
  c: Ctx,
  w: number,
  h: number,
  cap: readonly [string, string, string, string?], // its light, middle and dark
  o: {
    stalk?: readonly [string, string];
    outline?: string | null;
    pen?: number;
    spots?: number;
    spotAlpha?: number;
  } = {},
) {
  const sw = w * 0.5,
    pen = o.pen ?? 2.6,
    outline = o.outline === undefined ? INK : o.outline,
    [stalkLit, stalkDark] = o.stalk ?? ['#fff3da', '#d9c0a0'];
  const stalk = () => {
    c.beginPath();
    c.moveTo(-sw * 0.62, 0);
    c.bezierCurveTo(-sw * 0.72, -h * 0.2, -sw * 0.42, -h * 0.4, -sw * 0.38, -h * 0.62);
    c.lineTo(sw * 0.38, -h * 0.62);
    c.bezierCurveTo(sw * 0.42, -h * 0.4, sw * 0.72, -h * 0.2, sw * 0.62, 0);
    c.quadraticCurveTo(0, h * 0.06, -sw * 0.62, 0);
    c.closePath();
  };
  stalk();
  c.fillStyle = linear(c, -sw * 0.6, 0, sw * 0.6, 0, [stalkLit, stalkDark]);
  c.fill();
  if (outline) {
    stalk();
    line(c, outline, pen);
  }
  // the gills under the cap
  ellipse(c, 0, -h * 0.5, w * 0.46, h * 0.11);
  c.fillStyle = mix(cap[2], '#1c1238', 0.45);
  c.fill();
  const dome = () => {
    c.beginPath();
    c.moveTo(-w / 2, -h * 0.5);
    c.bezierCurveTo(-w / 2, -h * 1.16, w / 2, -h * 1.16, w / 2, -h * 0.5);
    c.quadraticCurveTo(w * 0.51, -h * 0.4, w * 0.3, -h * 0.43);
    c.quadraticCurveTo(0, -h * 0.36, -w * 0.3, -h * 0.43);
    c.quadraticCurveTo(-w * 0.51, -h * 0.4, -w / 2, -h * 0.5);
    c.closePath();
  };
  dome();
  c.fillStyle = radial(c, 0, -h * 0.62, w * 0.72, [cap[0], cap[1], cap[2]], -w * 0.18, -h * 0.84);
  c.fill();
  inside(c, dome, () => {
    glow(c, w * 0.34, -h * 0.46, w * 0.5, mix(cap[2], '#1c1238', 0.3), 0.55, h * 0.3);
    const spots = o.spots ?? 4;
    for (let i = 0; i < spots; i++) {
      const u = (i + 0.5) / spots,
        x = (u - 0.5) * w * 0.82,
        y = -h * (0.62 + 0.3 * Math.sin(u * Math.PI)) + (i % 2) * h * 0.08,
        r = w * (0.058 + (i % 2) * 0.028);
      ellipse(c, x, y, r, r * 0.86);
      c.fillStyle = `rgba(255,255,255,${o.spotAlpha ?? 0.88})`;
      c.fill();
    }
    glow(c, -w * 0.2, -h * 0.86, w * 0.26, '#ffffff', (o.spotAlpha ?? 0.88) * 0.68, h * 0.12);
  });
  if (outline) {
    dome();
    line(c, outline, pen);
  }
}

// A giant mushroom that glows, in a hazy layer: no outlines, and light spilling round it. fade: how far it has
// gone into the dusk. Even the nearest is well faded, or it would be taken for something in the fight.
function glowShroom(c: Ctx, x: number, y: number, h: number, kind: number, fade: number) {
  const [lit, mid, dark, halo] = SHROOM_COLOURS[kind % SHROOM_COLOURS.length],
    w = h * 0.84,
    dusk = (col: string, k = fade) => mix(col, '#2c2c6c', k);
  glow(c, x, y - h * 0.72, h * 1.05, halo, 0.34 * (1 - fade * 0.45), h * 0.9);
  c.save();
  c.translate(x, y);
  drawMushroom(c, w, h, [dusk(lit), dusk(mid), dusk(dark)], {
    stalk: [dusk('#c8cce6', fade + 0.12), dusk('#7a80ac', fade + 0.12)],
    outline: null,
    spots: 3,
    spotAlpha: 0.72 * (1 - fade * 0.7),
  });
  c.restore();
}

// ---- the trees ----

// A trunk from `bottom` up to `top`, flaring at the roots and leaning a little.
function trunk(c: Ctx, x: number, bottom: number, top: number, w: number, lean: number) {
  const mid = (top + bottom) / 2;
  c.beginPath();
  c.moveTo(x - w * 1.05, bottom);
  c.bezierCurveTo(x - w * 0.55, bottom - 36, x - w * 0.5 + lean * 0.3, mid, x - w * 0.36 + lean, top);
  c.lineTo(x + w * 0.36 + lean, top);
  c.bezierCurveTo(x + w * 0.5 + lean * 0.3, mid, x + w * 0.55, bottom - 36, x + w * 1.05, bottom);
  c.closePath();
}

// One layer of forest in one colour, which paints what's been drawn from top to bottom: the farther, the paler
// toward the light on the horizon. `h` is how far down its ground starts at the strip's x.
function forest(
  c: Ctx,
  P: number,
  seed: number,
  o: {
    trees: number;
    width: readonly [number, number];
    leaves: number; // how deep the mass of leaves overhead hangs
    ground: (x: number) => number;
    stops: Stops;
    branches?: number;
  },
) {
  const rand = seeded(seed);
  c.fillStyle = '#000';
  for (let i = 0; i < o.trees; i++) {
    const x = ((i + rand() * 0.8) / o.trees) * P,
      w = o.width[0] + rand() * (o.width[1] - o.width[0]),
      lean = (rand() - 0.5) * 34,
      y = o.ground(x) + 10;
    repeat(P, (dx) => {
      trunk(c, x + dx, y, -10, w, lean);
      c.fill();
    });
    for (let b = 0; b < (o.branches ?? 0); b++) {
      const by = o.leaves + rand() * (y - o.leaves) * 0.45,
        side = rand() < 0.5 ? -1 : 1,
        len = 40 + rand() * 90,
        rise = 20 + rand() * 50;
      repeat(P, (dx) => {
        c.beginPath();
        c.moveTo(x + dx + lean * 0.5, by);
        c.quadraticCurveTo(x + dx + side * len * 0.6, by - rise * 0.2, x + dx + side * len, by - rise);
        c.lineWidth = w * 0.26;
        c.lineCap = 'round';
        c.strokeStyle = '#000';
        c.stroke();
      });
    }
  }
  // the mass of leaves overhead
  for (let x = 0; x < P; x += 26 + rand() * 30) {
    const r = 26 + rand() * 40,
      y = o.leaves * (0.3 + rand() * 0.7) - r * 0.2;
    repeat(P, (dx) => {
      circle(c, x + dx, y, r);
      c.fill();
    });
  }
  c.fillRect(0, -2, P, o.leaves * 0.4);
  // the rise of ground the trees stand on
  c.beginPath();
  c.moveTo(0, GROUND + 4);
  for (let x = 0; x <= P; x += 8) c.lineTo(x, o.ground(x));
  c.lineTo(P, GROUND + 4);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = linear(c, 0, 0, 0, GROUND, o.stops);
  c.fillRect(0, -2, P, GROUND + 8);
  c.globalCompositeOperation = 'source-over';
}

function drawFarTrees(c: Ctx) {
  forest(c, FOREST_P, 201, {
    trees: 34,
    width: [9, 20],
    leaves: 96,
    ground: (x) => 392 - 14 * wave(x, FOREST_P, 3, 0.6) - 6 * wave(x, FOREST_P, 8),
    stops: [
      [0, '#3e3d86'],
      [0.42, '#6d5aa2'],
      [0.72, '#b67fa2'],
      [1, '#eda888'],
    ],
  });
  // the last of the day, low between the trunks
  const rand = seeded(202);
  for (let i = 0; i < 12; i++) {
    const x = rand() * FOREST_P,
      r = 110 + rand() * 120;
    repeat(FOREST_P, (dx) => glow(c, x + dx, 372 + rand() * 20, r, '#ffc98a', 0.3, 42));
  }
}

function drawMidTrees(c: Ctx) {
  const ground = (x: number) => 408 - 12 * wave(x, FOREST_P, 4, 2) - 5 * wave(x, FOREST_P, 11, 1);
  forest(c, FOREST_P, 211, {
    trees: 19,
    width: [20, 38],
    leaves: 74,
    branches: 2,
    ground,
    stops: [
      [0, '#272a68'],
      [0.5, '#3e3c82'],
      [0.8, '#67508f'],
      [1, '#8a5f90'],
    ],
  });
  const rand = seeded(212);
  for (let i = 0; i < 11; i++) {
    const x = ((i + rand()) / 11) * FOREST_P,
      h = 34 + rand() * 40,
      kind = i;
    repeat(FOREST_P, (dx) => glowShroom(c, x + dx, ground(x) + 8, h, kind, 0.62));
  }
}

function drawNearTrees(c: Ctx) {
  const ground = (x: number) => 426 - 10 * wave(x, NEAR_P, 2, 1) - 4 * wave(x, NEAR_P, 5, 2.4);
  forest(c, NEAR_P, 221, {
    trees: 6,
    width: [34, 58],
    leaves: 52,
    branches: 2,
    ground,
    stops: [
      [0, '#1b2056'],
      [0.6, '#2a3069'],
      [0.86, '#33436f'],
      [1, '#2d5a6c'],
    ],
  });
  const rand = seeded(222);
  // bark lit along one side, and moss where the trunks meet the ground
  for (let i = 0; i < 90; i++) {
    const x = rand() * NEAR_P,
      y = ground(x) + 2 + rand() * 10,
      r = 3 + rand() * 7;
    repeat(NEAR_P, (dx) => {
      circle(c, x + dx, y, r);
      c.fillStyle = i % 3 ? 'rgba(62,140,120,0.55)' : 'rgba(110,200,150,0.5)';
      c.fill();
    });
  }
  for (let i = 0; i < 7; i++) {
    const x = ((i + 0.2 + rand() * 0.6) / 7) * NEAR_P,
      h = 58 + rand() * 62,
      kind = i + 1;
    repeat(NEAR_P, (dx) => glowShroom(c, x + dx, ground(x) + 10, h, kind, 0.46));
  }
}

// A great tree standing behind the fight; its foot at (0, 0), running off the top of the screen.
function drawTree(c: Ctx, kind: number) {
  const rand = seeded(230 + kind),
    w = 42 + kind * 8;
  glow(c, 0, 4, w * 1.8, '#0b0a2a', 0.5, 12);
  const bark = () => trunk(c, 0, 4, -496, w, (kind - 1) * 16);
  bark();
  c.fillStyle = linear(c, -w, 0, w, 0, ['#4b5590', '#343a78', '#20245c']);
  c.fill();
  inside(c, bark, () => {
    for (let i = 0; i < 11; i++) {
      const x = -w * 0.8 + rand() * w * 1.6;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x - 8, -130, x + 8, -300, x + (kind - 1) * 14, -496);
      line(c, '#141440', 2 + rand() * 2, 0.55);
    }
    // the moss creeping up from the foot
    for (let i = 0; i < 90; i++) {
      const x = -w * 1.05 + rand() * w * 2.1,
        y = 4 - rand() * rand() * 84,
        r = 2 + rand() * 3.2;
      circle(c, x, y, r);
      c.fillStyle = i % 3 ? '#2f7a70' : '#46a088';
      c.fill();
    }
  });
  // shelf fungi growing out of the bark, in the tree's own dim colours: nothing up here is for standing on
  for (let i = 0; i < 3; i++) {
    const y = -96 - i * 86 - rand() * 26,
      side = i % 2 ? 1 : -1,
      up = -y / 496, // how far up the trunk: it narrows, and leans
      x = side * w * (0.5 - up * 0.14) + (kind - 1) * 16 * up,
      r = 9 + rand() * 4;
    c.beginPath();
    c.ellipse(x, y, r, r * 0.42, 0, Math.PI, 0);
    c.quadraticCurveTo(x, y + r * 0.3, x - r, y);
    c.closePath();
    c.fillStyle = linear(c, 0, y - r * 0.4, 0, y + r * 0.3, ['#7f86ba', '#4a4f8c']);
    c.fill();
  }
}

// ---- strips near the fight ----

// A fern from (x, y): a curved stem with leaflets getting smaller to the tip.
function fern(c: Ctx, x: number, y: number, len: number, lean: number, fill: string) {
  const steps = 8;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + lean * 0.3, y - len * 0.6, x + lean, y - len);
  line(c, fill, 2);
  for (let i = 1; i <= steps; i++) {
    const u = i / steps,
      px = x + lean * u * u,
      py = y - len * u,
      l = (1 - u * 0.75) * len * 0.3;
    for (const side of [-1, 1]) {
      leaf(c, px, py, l, l * 0.26, -Math.PI / 2 + side * 1.15);
      c.fillStyle = fill;
      c.fill();
    }
  }
}

// The undergrowth behind the ground: ferns and low brush in the wood's dark blue-green.
function drawBrush(c: Ctx) {
  const rand = seeded(241);
  for (let x = 0; x < BRUSH_P; x += 10 + rand() * 14) {
    const r = 16 + rand() * 20,
      y = GROUND + 4 - r * 0.45,
      fill = mix('#1d4a58', '#245a60', rand());
    repeat(BRUSH_P, (dx) => {
      circle(c, x + dx, y, r);
      c.fillStyle = fill;
      c.fill();
    });
  }
  for (let i = 0; i < 44; i++) {
    const x = rand() * BRUSH_P,
      len = 32 + rand() * 34,
      lean = (rand() - 0.5) * 42,
      fill = mix('#2c7a72', '#3f9c84', rand());
    repeat(BRUSH_P, (dx) => fern(c, x + dx, GROUND + 2, len, lean, fill));
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * BRUSH_P,
      y = GROUND - 6 - rand() * 34,
      col = SHROOM_COLOURS[i % 3][3];
    repeat(BRUSH_P, (dx) => {
      glow(c, x + dx, y, 7, col, 0.7);
      circle(c, x + dx, y, 1.5);
      c.fillStyle = '#ffffff';
      c.fill();
    });
  }
}

// The leaves overhead, hanging in from the top of the screen, with vines trailing down.
function drawCanopy(c: Ctx) {
  const rand = seeded(251);
  for (let i = 0; i < 16; i++) {
    const x = rand() * CANOPY_P,
      len = 34 + rand() * 70,
      sway = (rand() - 0.5) * 18;
    repeat(CANOPY_P, (dx) => {
      c.beginPath();
      c.moveTo(x + dx, 10);
      c.quadraticCurveTo(x + dx + sway, len * 0.6, x + dx + sway * 0.4, len);
      line(c, '#1a2a50', 2.2);
      for (let y = 22; y < len; y += 14) {
        leaf(c, x + dx + sway * (y / len), y, 9, 3, 0.9 + (y % 28 ? 0 : 1.3));
        c.fillStyle = '#23405e';
        c.fill();
      }
    });
  }
  for (const [n, top, r, fill] of [
    [46, 12, 26, '#141c48'],
    [40, 6, 20, '#1b2a58'],
    [30, 0, 14, '#2a4a6e'],
  ] as const)
    for (let i = 0; i < n; i++) {
      const x = rand() * CANOPY_P,
        y = top + rand() * 22,
        rr = r * (0.7 + rand() * 0.6);
      repeat(CANOPY_P, (dx) => {
        circle(c, x + dx, y, rr);
        c.fillStyle = fill;
        c.fill();
      });
    }
}

function drawFrontFerns(c: Ctx) {
  const rand = seeded(261);
  for (let x = 0; x < TILE; x += 5 + rand() * 7) {
    const h = 16 + rand() * 22 + Math.max(0, wave(x, TILE, 4)) * 16,
      w = 8 + rand() * 5,
      lean = (rand() - 0.5) * 22,
      fill = [mix('#07121e', '#0d2030', rand()), mix('#123a48', '#1c4f5a', rand())] as const;
    repeat(TILE, (dx) => {
      blade(c, x + dx, 4, h, w, lean);
      c.fillStyle = linear(c, 0, 0, 0, -h, [fill[0], fill[1]]);
      c.fill();
    });
  }
}

// ---- the ground and what stands on it ----

function drawMossGround(c: Ctx) {
  drawGroundStrip(c, MOSS);
  // glowing specks in the moss
  const rand = seeded(271);
  for (let i = 0; i < 70; i++) {
    const x = rand() * TILE,
      y = GROUND + 1 + rand() * 12,
      col = SHROOM_COLOURS[i % 3][3];
    repeat(TILE, (dx) => {
      glow(c, x + dx, y, 4.5, col, 0.65);
      circle(c, x + dx, y, 1);
      c.fillStyle = '#ffffff';
      c.fill();
    });
  }
}

// A trunk too tall to jump, cut off and mossy; (0, 0) is its bottom-left corner, and it is stretched to fit.
function drawStump(c: Ctx) {
  const rand = seeded(281),
    body = () => {
      c.beginPath();
      c.moveTo(-3, 4);
      c.bezierCurveTo(2, -40, 3, -150, 2, -196);
      c.lineTo(68, -196);
      c.bezierCurveTo(67, -150, 68, -40, 73, 4);
      c.closePath();
    };
  glow(c, 35, 4, 62, '#0b0a2a', 0.5, 7);
  body();
  c.fillStyle = linear(c, 0, 0, 70, 0, ['#8a6a78', '#5c4262', '#3a2a4c']);
  c.fill();
  inside(c, body, () => {
    for (let i = 0; i < 9; i++) {
      const x = 5 + rand() * 60;
      c.beginPath();
      c.moveTo(x, 4);
      c.bezierCurveTo(x - 4, -60, x + 5, -130, x - 1, -196);
      line(c, '#241633', 1.6 + rand() * 1.8, 0.65);
    }
    glow(c, 16, -120, 22, '#ffffff', 0.16, 90);
    for (let i = 0; i < 120; i++) {
      const x = rand() * 74,
        y = 4 - rand() * rand() * 62,
        r = 2 + rand() * 3.2;
      circle(c, x, y, r);
      c.fillStyle = i % 3 ? '#2f8f78' : '#58c49a';
      c.fill();
    }
  });
  body();
  line(c, INK, 3);
  // the cut top, with its rings and a cushion of moss round the edge
  ellipse(c, 35, -196, 34, 8);
  c.fillStyle = radial(c, 35, -196, 34, ['#e2c9a4', '#b89878', '#8a6a58']);
  c.fill();
  line(c, INK, 2.6);
  for (const k of [0.68, 0.38]) {
    ellipse(c, 35, -196, 34 * k, 8 * k);
    line(c, '#7a5a48', 1.2, 0.7);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU,
      x = 35 + Math.cos(a) * 33,
      y = -196 + Math.sin(a) * 7;
    circle(c, x, y, 3.4 + (i % 3));
    c.fillStyle = i % 2 ? '#46b08a' : '#7fe0ac';
    c.fill();
  }
}

// A wall of brambles rising from the ground, (0, 0) at the middle of its foot: thick stems woven together, in
// the same dark red and cream thorns as any bramble, so it reads as a thing that won't let Pip by.
function drawBrambleWall(c: Ctx) {
  const rand = seeded(291);
  glow(c, 0, 2, 54, '#0b0a2a', 0.55, 10);
  const strands = [
    [-20, 0.022, 13],
    [20, 0.026, 11],
    [-8, 0.031, 14],
    [10, 0.019, 12],
  ] as const;
  const path = ([x0, k, amp]: (typeof strands)[number]) => {
    c.beginPath();
    c.moveTo(x0, 4);
    for (let y = 0; y >= -440; y -= 10) c.lineTo(x0 * 0.6 + Math.sin(y * k + x0) * amp, y);
  };
  for (const s of strands) {
    path(s);
    line(c, '#24070f', 15);
  }
  for (const s of strands) {
    path(s);
    line(c, '#7d2746', 10);
    path(s);
    c.save();
    c.translate(-2, 0);
    line(c, '#c2506c', 2.6, 0.8);
    c.restore();
  }
  for (let i = 0; i < 60; i++) {
    const s = strands[i % strands.length],
      y = -8 - rand() * 428,
      x = s[0] * 0.6 + Math.sin(y * s[1] + s[0]) * s[2],
      side = rand() < 0.5 ? -1 : 1,
      a = side > 0 ? -0.5 + rand() : Math.PI + 0.5 - rand();
    c.beginPath();
    c.moveTo(x + Math.cos(a + 1.4) * 4, y + Math.sin(a + 1.4) * 4);
    c.lineTo(x + Math.cos(a) * (13 + rand() * 6), y + Math.sin(a) * (13 + rand() * 6));
    c.lineTo(x + Math.cos(a - 1.4) * 4, y + Math.sin(a - 1.4) * 4);
    c.closePath();
    c.fillStyle = '#fff1d6';
    c.fill();
    line(c, '#24070f', 1.4);
  }
  for (let i = 0; i < 18; i++) {
    const y = -20 - rand() * 400,
      x = (rand() - 0.5) * 34;
    leaf(c, x, y, 13, 4.5, rand() * TAU);
    c.fillStyle = i % 2 ? '#3f7a5a' : '#2f6450';
    c.fill();
    line(c, '#142e26', 1.4);
  }
}

// A flat-topped mushroom for Pip to stand on, w wide, its top at y = 0 (on its stalk, drawStem).
function drawShelf(c: Ctx, w: number) {
  const half = w / 2,
    body = () => {
      c.beginPath();
      c.moveTo(-half - 9, 3);
      c.quadraticCurveTo(-half - 2, -5, -half * 0.6, -5);
      c.quadraticCurveTo(0, -8, half * 0.6, -5);
      c.quadraticCurveTo(half + 2, -5, half + 9, 3);
      c.quadraticCurveTo(half + 4, 15, half * 0.5, 13);
      c.quadraticCurveTo(0, 18, -half * 0.5, 13);
      c.quadraticCurveTo(-half - 4, 15, -half - 9, 3);
      c.closePath();
    };
  body();
  c.fillStyle = linear(c, 0, -8, 0, 18, ['#a4f2ec', '#4bb8c6', '#2a6c9c']);
  c.fill();
  inside(c, body, () => {
    // gills along the underside
    for (let x = -half - 6; x < half + 6; x += 7) {
      c.beginPath();
      c.moveTo(x, 8);
      c.lineTo(x * 0.92, 18);
      line(c, '#1a3c70', 1.5, 0.75);
    }
    for (let i = 0; i < Math.floor(w / 30); i++) {
      const x = -half + 16 + i * 30;
      ellipse(c, x, -1, 5.5, 2.6);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fill();
    }
    glow(c, -half * 0.4, -5, half * 0.75, '#ffffff', 0.5, 5);
  });
  body();
  line(c, INK, 2.8);
}

// The tall stalk under a shelf: (0, 0) just under its top, `drop` long, with a skirt partway down.
function drawStem(c: Ctx, drop: number, lean: number) {
  const body = () => {
    c.beginPath();
    c.moveTo(-9, 0);
    c.quadraticCurveTo(-9 + lean * 0.3, drop * 0.5, -15, drop + 2);
    c.lineTo(15, drop + 2);
    c.quadraticCurveTo(9 + lean * 0.3, drop * 0.5, 9, 0);
    c.closePath();
  };
  body();
  c.fillStyle = linear(c, -12, 0, 12, 0, ['#e6e2ee', '#b4aecb', '#7f79a4']);
  c.fill();
  body();
  line(c, INK, 2.6);
  ellipse(c, lean * 0.1, drop * 0.2, 13, 4);
  c.fillStyle = '#d6d0e4';
  c.fill();
  line(c, INK, 2);
  const rand = seeded(drop);
  for (let i = 0; i < 12; i++) {
    circle(c, -15 + rand() * 30, drop - rand() * 14, 3 + rand() * 3.5);
    c.fillStyle = i % 2 ? '#46b08a' : '#7fe0ac';
    c.fill();
  }
}

// The signpost at the start; (0, 0) is the foot of its post.
function drawWoodSign(c: Ctx) {
  glow(c, 0, 1, 34, '#0b0a2a', 0.45, 6);
  roundRect(c, -4, -70, 8, 70, 3);
  c.fillStyle = linear(c, -4, 0, 4, 0, ['#8a6a78', '#4a3450']);
  c.fill();
  line(c, INK, 2.2);
  const board = () => {
    c.beginPath();
    c.moveTo(-62, -86);
    c.lineTo(50, -86);
    c.lineTo(66, -70);
    c.lineTo(50, -54);
    c.lineTo(-62, -54);
    c.quadraticCurveTo(-66, -70, -62, -86);
    c.closePath();
  };
  board();
  c.fillStyle = linear(c, 0, -86, 0, -54, ['#e6c9a4', '#c49c7e', '#9a7468']);
  c.fill();
  inside(c, board, () => {
    for (const y of [-78, -66, -58]) {
      c.beginPath();
      c.moveTo(-62, y);
      c.lineTo(66, y + 1);
      line(c, '#6a4a50', 1, 0.4);
    }
    for (let i = 0; i < 10; i++) {
      circle(c, -60 + i * 13, -86 + (i % 3) * 1.6, 3.2);
      c.fillStyle = i % 2 ? '#46b08a' : '#7fe0ac';
      c.fill();
    }
  });
  board();
  line(c, INK, 2.6);
  c.font = `700 14px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#3e2238';
  c.fillText(WOOD.sign, -4, -68);
  // a glowing mushroom at its foot
  c.save();
  c.translate(-16, 0);
  glow(c, 0, -14, 22, SHROOM_COLOURS[0][3], 0.6);
  drawMushroom(c, 20, 20, SHROOM_COLOURS[0], { pen: 1.8, spots: 2 });
  c.restore();
}

// Mo's Hollow: an arch of two great roots meeting overhead, with glowing mushrooms and a sign; (0, 0) is the
// middle of its foot.
function drawWoodGate(c: Ctx) {
  const half = 62,
    top = -176;
  glow(c, 0, 2, half + 30, '#0b0a2a', 0.5, 8);
  // the dark inside the hollow, with a blue light at the far end
  glow(c, 0, -70, 70, SHROOM_COLOURS[0][3], 0.35, 90);
  const arch = () => {
    c.beginPath();
    c.moveTo(-half - 4, 4);
    c.bezierCurveTo(-half + 2, -40, -half - 2, top + 60, -half + 4, top + 44);
    c.bezierCurveTo(-half + 14, top - 8, half - 14, top - 8, half - 4, top + 44);
    c.bezierCurveTo(half + 2, top + 60, half - 2, -40, half + 4, 4);
  };
  arch();
  line(c, INK, 21);
  arch();
  line(c, '#5c4262', 16);
  c.save();
  c.translate(-3, -1);
  arch();
  line(c, '#8a6a78', 5, 0.9);
  c.restore();
  // moss over the top and down the sides
  const rand = seeded(301);
  for (let i = 0; i < 60; i++) {
    const u = rand(),
      a = Math.PI * (1 + u),
      x = Math.cos(a) * (half - 2) + (rand() - 0.5) * 8,
      y = top + 46 + Math.sin(a) * 42 + (rand() - 0.5) * 8;
    circle(c, x, y, 3 + rand() * 3.5);
    c.fillStyle = i % 2 ? '#46b08a' : '#7fe0ac';
    c.fill();
  }
  // mushrooms growing on it, glowing
  for (const [x, y, s, kind] of [
    [-60, top + 42, 25, 0],
    [-30, top + 10, 32, 1],
    [18, top + 3, 38, 0],
    [52, top + 30, 26, 2],
    [-74, -22, 22, 2],
    [76, -14, 26, 0],
  ] as const) {
    glow(c, x, y - s * 0.7, s * 1.2, SHROOM_COLOURS[kind][3], 0.55);
    c.save();
    c.translate(x, y);
    drawMushroom(c, s, s, SHROOM_COLOURS[kind], { pen: 2, spots: 3 });
    c.restore();
  }
  // the hanging sign
  for (const x of [-34, 34]) {
    c.beginPath();
    c.moveTo(x * 0.8, top + 24);
    c.lineTo(x, top + 46);
    line(c, '#2a1a3a', 1.8);
  }
  const board = () => roundRect(c, -52, top + 44, 104, 26, 7);
  board();
  c.fillStyle = linear(c, 0, top + 44, 0, top + 70, ['#fff3c4', '#e8c98a']);
  c.fill();
  board();
  line(c, INK, 2.4);
  c.font = `700 12px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#4a2a50';
  c.fillText(WOOD.gate, 0, top + 57.5);
}

// Mo far away over the trees, still sulking: hazy like everything that far, but his own blue, and glowing.
function drawFarMo(c: Ctx) {
  const haze = (col: string) => mix(col, '#7a6aa8', 0.32);
  glow(c, 0, -140, 110, '#7feaff', 0.5, 86);
  c.save();
  drawMushroom(c, 140, 200, [haze('#a8d4ff'), haze('#4a7fd8'), haze('#27408f')], {
    stalk: [haze('#e8e4f0'), haze('#8e88b0')],
    outline: null,
    spots: 5,
    spotAlpha: 0.5,
  });
  c.restore();
  c.globalAlpha = 0.8;
  drawFace(c, 0, -62, 0.9, 'angry');
  c.globalAlpha = 1;
}

// The small mushroom that grows where a plant was cheered up, glowing and smiling; (0, 0) is where it stands.
function drawGlowBloom(c: Ctx, kind: number) {
  const col = SHROOM_COLOURS[kind],
    size = [34, 28, 31][kind];
  glow(c, 0, -size * 0.65, size * 1.15, col[3], 0.75);
  drawMushroom(c, size, size * 1.08, col, { pen: 2.2, spots: 3 });
  drawFace(c, 0, -size * 0.28, 0.26, 'happy');
}

// Small things strewn along the moss.
function drawDressing(c: Ctx, kind: number) {
  const rand = seeded(310 + kind);
  if (kind === 0 || kind === 1) {
    for (let i = 0; i < 3; i++)
      fern(c, (i - 1) * 4, 2, 20 + rand() * 12, (i - 1) * 9 + rand() * 4, i % 2 ? '#46b08a' : '#2f8f78');
  } else if (kind === 2 || kind === 3) {
    const col = SHROOM_COLOURS[kind - 2];
    glow(c, 0, -10, 15, col[3], 0.65);
    c.save();
    c.translate(-5, 0);
    drawMushroom(c, 11, 13, col, { pen: 1.4, spots: 2 });
    c.restore();
    c.save();
    c.translate(5, 0);
    drawMushroom(c, 15, 18, col, { pen: 1.5, spots: 2 });
    c.restore();
  } else if (kind === 4) {
    ellipse(c, 0, -5, 11, 7);
    c.fillStyle = radial(c, 0, -5, 12, ['#b2b1cf', '#73729c', '#4c4c74'], -4, -8);
    c.fill();
    line(c, INK, 1.6);
    for (let i = 0; i < 6; i++) {
      circle(c, -8 + i * 3.2, -10 + (i % 2) * 1.5, 2.6);
      c.fillStyle = i % 2 ? '#46b08a' : '#7fe0ac';
      c.fill();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      blade(c, (i - 3) * 3, 2, 9 + rand() * 9, 3.6, (i - 3) * 1.2);
      c.fillStyle = i % 2 ? '#58c49a' : '#2f8f78';
      c.fill();
    }
  }
}

export function bakeWood(scene: Scene) {
  bakeWoodEnemies(scene);
  bakeMo(scene);
  bakeMoAttacks(scene);
  // the sky's own: the moon, with its glow on the same part so that the two cost one draw
  bake(
    scene,
    'moon',
    300,
    300,
    150,
    150,
    (c) => {
      c.fillStyle = radial(c, 0, 0, 150, [
        [0, 'rgba(226,236,255,0.72)'],
        [0.3, 'rgba(190,210,255,0.34)'],
        [1, 'rgba(160,180,255,0)'],
      ]);
      c.fillRect(-150, -150, 300, 300);
      const disc = () => circle(c, 0, 0, 40);
      disc();
      c.fillStyle = radial(c, 0, 0, 44, ['#ffffff', '#eef0ff', '#b9c2ea'], -13, -15);
      c.fill();
      inside(c, disc, () => {
        for (const [x, y, r] of [
          [-12, -8, 8],
          [14, 10, 10],
          [-4, 20, 5.5],
          [20, -16, 6],
          [-24, 12, 5],
        ] as const) {
          circle(c, x, y, r);
          c.fillStyle = 'rgba(150,160,210,0.4)';
          c.fill();
          c.beginPath();
          c.arc(x, y, r, 0.2, 2.2);
          line(c, 'rgba(255,255,255,0.65)', 1.2);
        }
      });
      disc();
      line(c, 'rgba(255,255,255,0.8)', 2);
    },
    1.6,
  );

  // the landscape, far to near
  bake(scene, 'wood-far', FOREST_P, GROUND + 4, 0, 0, drawFarTrees, SOFT);
  bake(scene, 'wood-far-mo', 270, 270, 135, 262, drawFarMo, SOFT);
  bake(scene, 'wood-mid', FOREST_P, GROUND + 4, 0, 0, drawMidTrees, SOFT);
  bake(scene, 'wood-near', NEAR_P, GROUND + 4, 0, 0, drawNearTrees, SOFT);
  for (let i = 0; i < WOOD_TREES; i++)
    bake(scene, `wood-tree-${i}`, 190, 500, 95, 490, (c) => drawTree(c, i), SOFT);
  for (let i = 0; i < WOOD_SHROOMS; i++) {
    const h = [190, 150, 120][i];
    bake(
      scene,
      `wood-shroom-${i}`,
      h * 2.3,
      h * 1.75,
      h * 1.15,
      h * 1.7,
      (c) => glowShroom(c, 0, 0, h, i, 0.34),
      SOFT,
    );
  }
  bake(scene, 'wood-brush', BRUSH_P, GROUND + 6 - 390, 0, -390, drawBrush);
  bake(scene, 'wood-canopy', CANOPY_P, 130, 0, 0, drawCanopy, SOFT);
  bake(scene, 'wood-front', TILE, 70, 0, 70, drawFrontFerns, SOFT);

  // the ground
  bake(scene, 'wood-ground', TILE, GROUND_BOTTOM - GROUND_TOP, 0, -GROUND_TOP, (c) => {
    drawMossGround(c);
    c.clearRect(0, GROUND_BOTTOM - 2, TILE, 2); // see bakeStage: the bottom rows of a tiling strip stay empty
  });
  bake(scene, 'wood-ground-end', 40, GROUND_BOTTOM - GROUND_TOP, 22, -GROUND_TOP, (c) =>
    drawGroundEnd(c, MOSS),
  );
  bake(scene, 'wood-pit', 100, GROUND_BOTTOM - GROUND + 2, 0, -(GROUND - 2), (c) => drawPit(c, 100, MOSS));
  for (let i = 0; i < WOOD_DRESS; i++)
    bake(scene, `wood-dress-${i}`, 46, 46, 23, 40, (c) => drawDressing(c, i));

  // what stands on it
  bake(scene, 'wood-log', 80, 50, 4, 44, (c) => drawLog(c, 70, 30));
  bake(scene, 'wood-thorns', 84, 40, 6, 36, (c) => drawThorns(c, 72));
  bake(scene, 'wood-trunk', 96, 226, 13, 216, drawStump);
  bake(scene, 'wood-bramble', 110, 460, 55, 452, drawBrambleWall, SOFT);
  bake(scene, 'wood-sign', 140, 104, 68, 98, drawWoodSign);
  bake(scene, 'wood-gate', 270, 280, 135, 272, drawWoodGate);
  for (let i = 0; i < WOOD_BLOOMS; i++)
    bake(scene, `wood-bloom-${i}`, 84, 84, 42, 78, (c) => drawGlowBloom(c, i));
  const widths = new Set<number>(),
    drops = new Set<number>();
  for (const p of [...STAGES[WOOD.stage].platforms, ...MO_PLATFORMS]) {
    widths.add(p.w);
    drops.add(GROUND - p.y - 8);
  }
  for (const w of widths) bake(scene, `wood-pad-${w}`, w + 44, 48, w / 2 + 20, 15, (c) => drawShelf(c, w));
  for (const drop of drops)
    bake(scene, `wood-stalk-${drop}`, 56, drop + 8, 28, 2, (c) => drawStem(c, drop, drop % 2 ? 6 : -5));
  bake(scene, 'wood-pad-shadow', 180, 20, 90, 10, (c) => glow(c, 0, 0, 86, '#0b0a2a', 0.42, 8), SOFT);
}
