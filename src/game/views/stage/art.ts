// A stage's own parts, drawn in code like everything else (see README "How it looks"): the garden path's
// ground as a strip that repeats, the edges of a pit and the pit itself, logs, bramble patches, the stalks
// under the leaf pads, the sign at the start, Sunny's gate at the end, the flowers that grow where a grumpy
// plant was cheered up, and behind it all the landscape in strips that repeat (mountains, far hills with
// cottages, the meadow, the fence), a cottage, hedges, and Sunny himself, small on the horizon.
// Strips that repeat are drawn so their two ends meet: shapes are periodic over the strip, and anything near
// one end is drawn again a strip away.
import type { Scene } from 'phaser';
import { GROUND, H, TAU } from '../../../config';
import { STAGES } from '../../../sim/stage/stages';
import { bake, SOFT } from '../../art/bake';
import { EARTH_LINE, LEAF_LINE, mix, rgba } from '../../art/color';
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
} from '../../art/draw';
import { drawFace } from '../../art/face';
import { drawLeafPlatform, drawStalk } from '../world/ground';
import { drawHedge } from '../world/land';

export const TILE = 960; // the ground strip repeats every TILE pixels
export const FAR_P = 1920; // ...the mountains and far hills every FAR_P (baked soft: they are hazy anyway)
export const MEADOW_P = 1024; // ...the meadow every MEADOW_P
export const FENCE_P = 480; // ...the fence every FENCE_P
export const GROUND_TOP = GROUND - 30; // the ground strip's top: the tallest blade stays below it
export const GROUND_BOTTOM = H + 24; // ...and its bottom, below the screen so a shake never shows its edge
export const LAND_TOP = 236; // nothing in the landscape strips reaches higher than this
export const BLOOMS = 3; // kinds of flower a cheered-up plant leaves behind
export const HEDGES = 2;

const wave = (x: number, p: number, k: number, phase = 0) => Math.sin((x / p) * TAU * k + phase);
// Draw something again a strip to either side, so a feature near one end carries on across the seam.
const repeat = (p: number, draw: (dx: number) => void) => {
  for (const dx of [-p, 0, p]) draw(dx);
};

// ---- the ground ----

const capTop = (x: number) => GROUND - 5 + wave(x, TILE, 7) * 1.6 + wave(x, TILE, 20, 1) * 1.1;

function drawSoil(c: Ctx, x0: number, x1: number, rand: () => number, specks: number) {
  c.fillStyle = linear(c, 0, GROUND, 0, H, ['#b5733f', '#8f5632', '#663b23']);
  c.fillRect(x0, GROUND + 2, x1 - x0, GROUND_BOTTOM - GROUND);
  // layers in the earth
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    for (let x = x0; x <= x1; x += 12) c.lineTo(x, GROUND + 30 + i * 11 + wave(x, TILE, 8, i * 1.7) * 4);
    line(c, '#472814', 2 + (i % 2), 0.2);
  }
  for (let i = 0; i < specks; i++) {
    const x = x0 + rand() * (x1 - x0),
      y = GROUND + 14 + rand() * 58,
      rx = 1 + rand() * 2.4,
      ry = 0.7 + rand() * 1.1,
      rot = rand() * 3,
      fill = i % 2 ? 'rgba(222,165,108,0.45)' : 'rgba(72,40,20,0.4)';
    repeat(TILE, (dx) => {
      ellipse(c, x + dx, y, rx, ry, rot);
      c.fillStyle = fill;
      c.fill();
    });
  }
}

function pebble(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number) {
  glow(c, x + 1, y + ry * 0.9, rx * 1.3, '#2b1608', 0.4, ry * 0.7);
  ellipse(c, x, y, rx, ry, rot);
  c.fillStyle = radial(c, x, y, rx * 1.3, ['#e6d8c4', '#a8937d', '#7d6855'], x - rx * 0.4, y - ry * 0.5);
  c.fill();
}

function root(c: Ctx, x: number, top: number, len: number, sway: number) {
  c.beginPath();
  c.moveTo(x, top);
  c.quadraticCurveTo(x + sway, top + len * 0.6, x + sway * 0.4, top + len);
  c.moveTo(x + sway * 0.5, top + len * 0.5);
  c.lineTo(x + sway * 0.5 + 5, top + len * 0.8);
  line(c, '#ecd3a6', 1.5, 0.55);
}

// The grass on top of the ground, hanging over the soil in scallops. `edge` is the list of scallops, right
// to left; each is [width, y at its end, how deep it hangs].
function drawTurf(c: Ctx, edge: readonly (readonly [number, number, number])[], rand: () => number) {
  const greens = ['#58b947', '#6fcd4c', '#48a640', '#8ade5c'];
  // blades standing behind the edge of the turf
  for (let x = 0; x < TILE; x += 3 + rand() * 3) {
    const h = 5 + rand() * 12,
      lean = (rand() - 0.5) * 7,
      fill = greens[Math.floor(rand() * greens.length)];
    repeat(TILE, (dx) => {
      blade(c, x + dx, capTop(x) + 4, h, 3.4, lean);
      c.fillStyle = fill;
      c.fill();
    });
  }
  // the scallops, from a strip to the right of this one to a strip to the left, so both seams line up
  const scallops = () => {
    let from = 2 * TILE;
    for (let round = 0; round < 3; round++)
      for (const [w, y, d] of edge) {
        const x = from - w;
        c.quadraticCurveTo((from + x) / 2, y + d * 2, x, y);
        from = x;
      }
  };
  const turf = () => {
    c.beginPath();
    c.moveTo(-TILE, capTop(-TILE));
    for (let x = -TILE; x <= 2 * TILE; x += 6) c.lineTo(x, capTop(x));
    c.lineTo(2 * TILE, edge[edge.length - 1][1]);
    scallops();
    c.closePath();
  };
  turf();
  c.fillStyle = linear(c, 0, GROUND - 6, 0, GROUND + 22, ['#a6ec6c', '#74d04e', '#4dae3d']);
  c.fill();
  inside(c, turf, () => {
    c.lineWidth = 1.3;
    for (let i = 0; i < 540; i++) {
      const x = rand() * TILE,
        y = capTop(x) + 3 + rand() * 16,
        h = 2.5 + rand() * 4,
        tip = (rand() - 0.5) * 3;
      c.strokeStyle = i % 3 ? 'rgba(200,246,142,0.7)' : 'rgba(52,140,54,0.55)';
      repeat(TILE, (dx) => {
        c.beginPath();
        c.moveTo(x + dx, y);
        c.lineTo(x + dx + tip, y - h);
        c.stroke();
      });
    }
  });
  c.beginPath();
  c.moveTo(2 * TILE, edge[edge.length - 1][1]);
  scallops();
  line(c, '#2a8038', 2.6);
  c.beginPath();
  for (let x = -TILE; x <= 2 * TILE; x += 6) c.lineTo(x, capTop(x) + 1);
  line(c, '#e0fba2', 2, 0.9);
}

function drawGroundStrip(c: Ctx) {
  const rand = seeded(3);
  drawSoil(c, 0, TILE, rand, 280);
  for (let i = 0; i < 18; i++) {
    const x = 10 + i * 53 + rand() * 30,
      y = GROUND + 28 + rand() * 36,
      rx = 5 + rand() * 7,
      ry = rx * (0.55 + rand() * 0.2),
      rot = (rand() - 0.5) * 0.5;
    repeat(TILE, (dx) => pebble(c, x + dx, y, rx, ry, rot));
  }
  for (let i = 0; i < 14; i++) {
    const x = 20 + i * 68 + rand() * 40,
      len = 12 + rand() * 20,
      sway = (rand() - 0.5) * 12;
    repeat(TILE, (dx) => root(c, x + dx, GROUND + 12, len, sway));
  }
  // the turf's shadow on the soil, and the screen's bottom edge falling into shade
  c.fillStyle = linear(c, 0, GROUND + 8, 0, GROUND + 36, ['rgba(52,26,10,0.55)', 'rgba(52,26,10,0)']);
  c.fillRect(0, GROUND + 8, TILE, 28);
  c.fillStyle = linear(c, 0, H - 26, 0, H, ['rgba(40,20,10,0)', 'rgba(40,20,10,0.35)']);
  c.fillRect(0, H - 26, TILE, GROUND_BOTTOM - H + 26);
  // scallops whose widths add up to exactly one strip, so the strip meets itself at both ends
  const widths: number[] = [];
  for (let sum = 0; sum < TILE;) {
    const w = 16 + rand() * 20;
    widths.push(w);
    sum += w;
  }
  const stretch = TILE / widths.reduce((a, b) => a + b, 0);
  const edge = widths.map((w) => [w * stretch, GROUND + 9 + rand() * 2, 5 + rand() * 7] as const);
  drawTurf(c, edge, rand);
}

// The right-hand end of a stretch of ground, where a pit begins; (0, 0) is the corner of the ground there.
// The left-hand end is the same part, flipped. It draws only the edge: the turf rounding the corner and the
// cut face of the soil beside it, falling into shade, so the strip's own turf and soil run right up to it.
const edgeX = (y: number) =>
  3.5 + 2.5 * Math.sin((y - GROUND) * 0.11) + 1.2 * Math.sin((y - GROUND) * 0.29 + 1);

function drawGroundEnd(c: Ctx) {
  const face = () => {
    c.beginPath();
    c.moveTo(-1, GROUND + 4);
    c.lineTo(-1, GROUND_BOTTOM);
    for (let y = GROUND_BOTTOM; y >= GROUND + 4; y -= 4) c.lineTo(edgeX(y), y);
    c.closePath();
  };
  face();
  c.fillStyle = linear(c, 0, GROUND, 0, H, ['#9a6036', '#77472a', '#55321c']);
  c.fill();
  // the soil near the edge falls into shade
  c.fillStyle = linear(c, -16, 0, 7, 0, ['rgba(40,20,8,0)', 'rgba(40,20,8,0.5)']);
  c.fillRect(-16, GROUND + 4, 24, GROUND_BOTTOM - GROUND - 4);
  c.beginPath();
  for (let y = GROUND + 6; y <= GROUND_BOTTOM; y += 4) c.lineTo(edgeX(y), y);
  line(c, EARTH_LINE, 2.4);
  pebble(c, 3, GROUND + 44, 4.5, 3, 0.3);
  // roots poking out of the cut and hanging down into the pit
  for (const [y, len, sway] of [
    [GROUND + 18, 26, 6],
    [GROUND + 50, 18, -3],
    [GROUND + 74, 22, 5],
  ] as const) {
    c.beginPath();
    c.moveTo(edgeX(y), y);
    c.quadraticCurveTo(edgeX(y) + 8 + sway, y + len * 0.5, edgeX(y) + 4 + sway * 0.5, y + len);
    line(c, '#d9b98a', 2, 0.8);
  }
  // the turf rounds the corner
  const top = capTop(0);
  const lip = () => {
    c.beginPath();
    c.moveTo(-16, top);
    c.lineTo(-6, top);
    c.quadraticCurveTo(5, top + 1, 7, GROUND + 3);
    c.quadraticCurveTo(8, GROUND + 12, 1, GROUND + 15);
    c.quadraticCurveTo(-6, GROUND + 17, -11, GROUND + 12);
    c.lineTo(-16, GROUND + 11);
    c.closePath();
  };
  lip();
  c.fillStyle = linear(c, 0, GROUND - 6, 0, GROUND + 22, ['#a6ec6c', '#74d04e', '#4dae3d']);
  c.fill();
  c.beginPath();
  c.moveTo(-6, top);
  c.quadraticCurveTo(5, top + 1, 7, GROUND + 3);
  c.quadraticCurveTo(8, GROUND + 12, 1, GROUND + 15);
  c.quadraticCurveTo(-6, GROUND + 17, -11, GROUND + 12);
  line(c, '#2a8038', 2.6);
  c.beginPath();
  c.moveTo(-16, top + 1);
  c.lineTo(-6, top + 1);
  c.quadraticCurveTo(4, top + 2, 5, GROUND + 2);
  line(c, '#e0fba2', 2, 0.9);
  const rand = seeded(31);
  for (let i = 0; i < 4; i++) {
    blade(c, -3 + i * 2.4, top + 3, 6 + rand() * 6, 3, 3 + i * 2);
    c.fillStyle = i % 2 ? '#6fcd4c' : '#58b947';
    c.fill();
  }
}

// Looking down into a pit: the far wall in shade, darkening to nothing. It is stretched across the gap.
function drawPit(c: Ctx, w: number) {
  c.fillStyle = linear(c, 0, GROUND, 0, GROUND_BOTTOM, ['#5a3420', '#3a2014', '#1d1009']);
  c.fillRect(0, GROUND - 2, w, GROUND_BOTTOM - GROUND + 2);
  const rand = seeded(33);
  for (let i = 0; i < 26; i++) {
    ellipse(c, rand() * w, GROUND + 8 + rand() * 50, 1 + rand() * 2, 0.7 + rand(), rand() * 3);
    c.fillStyle = 'rgba(140,90,55,0.35)';
    c.fill();
  }
  // the lips of the pit cast shade into it
  c.fillStyle = linear(c, 0, GROUND, 0, GROUND + 30, ['rgba(20,10,4,0.6)', 'rgba(20,10,4,0)']);
  c.fillRect(0, GROUND - 2, w, 32);
}

// ---- things on the ground ----

// A log lying on the ground, the cut end toward the viewer's right; (0, 0) is its bottom-left corner.
function drawLog(c: Ctx, w: number, h: number) {
  const r = h / 2,
    body = () => roundRect(c, 0, -h, w, h, r);
  glow(c, w / 2, 1, w * 0.62, '#173d1f', 0.35, 5);
  body();
  c.fillStyle = linear(c, 0, -h, 0, 0, ['#b5824f', '#8a5a33', '#5e3a20']);
  c.fill();
  inside(c, body, () => {
    // grooves in the bark
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      const y = -h + 6 + i * 5;
      c.moveTo(4, y);
      c.bezierCurveTo(w * 0.3, y - 2, w * 0.6, y + 2, w - 8, y - 1);
      line(c, '#4a2c16', 1.4, 0.45);
    }
    glow(c, w * 0.35, -h + 6, w * 0.4, '#ffffff', 0.25, 4);
    // moss along the top
    for (let i = 0; i < 9; i++) {
      circle(c, 6 + (i * (w - 16)) / 8, -h + 2, 4.5 - (i % 3));
      c.fillStyle = i % 2 ? '#7cc644' : '#5aa83a';
      c.fill();
    }
  });
  body();
  line(c, EARTH_LINE, 2.6);
  // the cut end, with its rings
  ellipse(c, w - r * 0.55, -r, r * 0.55, r - 1.5);
  c.fillStyle = radial(c, w - r * 0.55, -r, r, ['#f0d3a0', '#d9ae73', '#b5824f']);
  c.fill();
  line(c, EARTH_LINE, 2);
  for (const k of [0.7, 0.42, 0.18]) {
    ellipse(c, w - r * 0.55, -r, r * 0.55 * k, (r - 1.5) * k);
    line(c, '#a07040', 1.1, 0.7);
  }
  // a tiny mushroom on top
  ellipse(c, w * 0.3, -h - 4, 6, 4.5);
  c.fillStyle = radial(c, w * 0.3 - 2, -h - 6, 7, ['#ff9d8a', '#e2463a']);
  c.fill();
  line(c, '#8a1f17', 1.5);
  c.fillStyle = '#fff';
  for (const [dx, dy] of [
    [-2, -6],
    [2.5, -5],
  ]) {
    circle(c, w * 0.3 + dx, -h + dy, 1.1);
    c.fill();
  }
}

// A patch of brambles: a low tangle of thorny stems that hurts to touch, dark and spiky so it reads as
// danger at a glance; (0, 0) is its bottom-left corner.
function drawThorns(c: Ctx, w: number) {
  const rand = seeded(41);
  glow(c, w / 2, 1, w * 0.62, '#173d1f', 0.4, 5);
  const stems: [number, number, number][] = []; // [x where it starts, x where it ends, height]
  for (let i = 0; i < 9; i++) stems.push([rand() * w * 0.45, w * 0.55 + rand() * w * 0.45, 13 + rand() * 13]);
  const arc = ([x0, x1, hh]: [number, number, number]) => {
    c.beginPath();
    c.moveTo(x0, 1);
    c.bezierCurveTo(x0 + (x1 - x0) * 0.15, -hh * 1.25, x1 - (x1 - x0) * 0.2, -hh * 1.1, x1, -1);
  };
  for (const s of stems) {
    arc(s);
    line(c, '#24070f', 6);
  }
  for (const s of stems) {
    arc(s);
    line(c, '#9b3050', 3);
  }
  // thorns sticking out of the stems, every way
  for (let i = 0; i < 30; i++) {
    const [x0, x1, hh] = stems[i % stems.length],
      u = 0.12 + rand() * 0.76,
      x = x0 + (x1 - x0) * u,
      y = -hh * 0.9 * Math.sin(u * Math.PI),
      a = -Math.PI / 2 + (rand() - 0.5) * 2.8;
    c.beginPath();
    c.moveTo(x + Math.cos(a + 1.5) * 2.6, y + Math.sin(a + 1.5) * 2.6);
    c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    c.lineTo(x + Math.cos(a - 1.5) * 2.6, y + Math.sin(a - 1.5) * 2.6);
    c.closePath();
    c.fillStyle = '#fff1d6';
    c.fill();
    line(c, '#24070f', 1.4);
  }
  for (let i = 0; i < 4; i++) {
    const x = 8 + rand() * (w - 16),
      y = -8 - rand() * 12;
    leaf(c, x, y, 11, 4, -Math.PI / 2 + (rand() - 0.5) * 2.2);
    c.fillStyle = '#3f7a35';
    c.fill();
    line(c, LEAF_LINE, 1.4);
  }
}

// The sign by Pip's gate at the start; (0, 0) is the foot of its post.
function drawSign(c: Ctx, text: string) {
  glow(c, 0, 1, 34, '#173d1f', 0.35, 6);
  roundRect(c, -4, -70, 8, 70, 3);
  c.fillStyle = linear(c, -4, 0, 4, 0, ['#b5824f', '#7a4e2c']);
  c.fill();
  line(c, EARTH_LINE, 2.2);
  // the board, shaped like an arrow pointing down the path
  const board = () => {
    c.beginPath();
    c.moveTo(-58, -86);
    c.lineTo(46, -86);
    c.lineTo(62, -70);
    c.lineTo(46, -54);
    c.lineTo(-58, -54);
    c.quadraticCurveTo(-62, -70, -58, -86);
    c.closePath();
  };
  board();
  c.fillStyle = linear(c, 0, -86, 0, -54, ['#f3d29a', '#d9a866', '#b9844b']);
  c.fill();
  inside(c, board, () => {
    for (const y of [-78, -66, -58]) {
      c.beginPath();
      c.moveTo(-58, y);
      c.lineTo(62, y + 1);
      line(c, '#9a6a3a', 1, 0.35);
    }
  });
  board();
  line(c, EARTH_LINE, 2.6);
  c.font = `700 15px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#5a3418';
  c.fillText(text, -4, -69);
  // a little pot of flowers at its foot
  roundRect(c, -22, -16, 18, 16, 3);
  c.fillStyle = linear(c, 0, -16, 0, 0, ['#e88a5a', '#b8552e']);
  c.fill();
  line(c, EARTH_LINE, 1.8);
  for (const [x, col] of [
    [-17, '#ffd23f'],
    [-9, '#ff8fb1'],
  ] as const) {
    c.beginPath();
    c.moveTo(x, -16);
    c.lineTo(x, -26);
    line(c, '#3f9d3a', 2);
    circle(c, x, -28, 4);
    c.fillStyle = col;
    c.fill();
    line(c, EARTH_LINE, 1);
  }
}

// Sunny's gate at the end of the path: an arch of trellis wound with vines and sunflowers, and a sign hanging
// from it; (0, 0) is the middle of its foot.
function drawGate(c: Ctx, text: string) {
  const half = 62,
    top = -176;
  glow(c, 0, 2, half + 30, '#173d1f', 0.35, 8);
  // the arch: two posts and a curve, in wood
  const arch = () => {
    c.beginPath();
    c.moveTo(-half, 0);
    c.lineTo(-half, top + 50);
    c.bezierCurveTo(-half, top - 8, half, top - 8, half, top + 50);
    c.lineTo(half, 0);
  };
  arch();
  line(c, EARTH_LINE, 15);
  arch();
  line(c, '#c08a55', 10);
  c.save();
  c.translate(-2, -1);
  arch();
  line(c, '#e6b880', 3, 0.8);
  c.restore();
  // trellis slats between the posts, over the top only
  for (let i = 1; i < 6; i++) {
    const x = -half + (i * half * 2) / 6;
    c.beginPath();
    c.moveTo(x, top + 4 + Math.abs(x) * 0.12);
    c.lineTo(x, top + 34);
    line(c, '#a87445', 3, 0.85);
  }
  // vines winding up both posts and over the arch
  const rand = seeded(47);
  const vine = (side: number) => {
    c.beginPath();
    for (let y = 0; y >= top + 30; y -= 6) c.lineTo(side * half + Math.sin(y * 0.09) * 7, y);
    for (let u = 0; u <= 1; u += 0.05)
      c.lineTo(side * half * (1 - u) + Math.sin(u * 9) * 5, top + 30 - Math.sin(u * Math.PI * 0.5) * 32);
    line(c, '#3f8a3a', 3);
  };
  vine(-1);
  vine(1);
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1,
      y = -10 - rand() * (top * -1 - 30),
      x = side * half + Math.sin(y * 0.09) * 7;
    leaf(c, x, y, 13, 5, (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 1.6);
    c.fillStyle = mix('#6fcd4c', '#4fae3f', rand());
    c.fill();
    line(c, LEAF_LINE, 1.5);
  }
  // three sunflowers on the arch: Sunny's family, all in a much better mood
  for (const [x, y, s] of [
    [-34, top + 18, 0.85],
    [0, top + 6, 1.05],
    [34, top + 18, 0.85],
  ] as const) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      leaf(c, x + Math.cos(a) * 8 * s, y + Math.sin(a) * 8 * s, 13 * s, 5 * s, a);
      c.fillStyle = i % 2 ? '#ffd23f' : '#ffbf2e';
      c.fill();
      line(c, '#c9780c', 1.3);
    }
    circle(c, x, y, 8.5 * s);
    c.fillStyle = radial(c, x - 2, y - 2, 9 * s, ['#a8743f', '#6b3f1c']);
    c.fill();
    line(c, '#3f2410', 1.6);
    drawFace(c, x, y + 0.5, 0.34 * s, 'happy');
  }
  // the hanging sign
  for (const x of [-34, 34]) {
    c.beginPath();
    c.moveTo(x * 0.8, top + 24);
    c.lineTo(x, top + 46);
    line(c, '#6b4423', 1.6);
  }
  const board = () => roundRect(c, -56, top + 44, 112, 26, 7);
  board();
  c.fillStyle = linear(c, 0, top + 44, 0, top + 70, ['#fff3c4', '#f5d77a']);
  c.fill();
  board();
  line(c, EARTH_LINE, 2.4);
  c.font = `700 12px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#8a4f12';
  c.fillText(text, 0, top + 57.5);
}

// The flower a grumpy plant turns into once cheered up, smiling; (0, 0) is where its stem meets the ground.
function drawBloom(c: Ctx, kind: number) {
  const colours = [
    ['#ffb3c7', '#ff7aa2', '#d94c7a'], // pink
    ['#fff09a', '#ffd23f', '#d99a1a'], // yellow
    ['#d8c4ff', '#b48cff', '#7f5ad2'], // lilac
  ][kind];
  c.beginPath();
  c.moveTo(0, 1);
  c.quadraticCurveTo(-3, -16, 0, -30);
  line(c, LEAF_LINE, 5);
  c.beginPath();
  c.moveTo(0, 1);
  c.quadraticCurveTo(-3, -16, 0, -30);
  line(c, '#5fbf4d', 2.6);
  for (const [y, side] of [
    [-10, -1],
    [-17, 1],
  ] as const) {
    leaf(c, 0, y, 13, 4.6, side > 0 ? -0.5 : Math.PI + 0.5);
    c.fillStyle = linear(c, -13, y, 13, y, ['#9be36b', '#58b548']);
    c.fill();
    line(c, LEAF_LINE, 1.6);
  }
  const cx = 0,
    cy = -40;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU - Math.PI / 2;
    ellipse(c, cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 9.5, 7.6, 5.4, a);
    c.fillStyle = radial(c, cx, cy, 18, [colours[0], colours[1]]);
    c.fill();
    line(c, colours[2], 1.6);
  }
  circle(c, cx, cy, 8.5);
  c.fillStyle = radial(c, cx - 2, cy - 2, 9, ['#fff6c8', '#ffd23f', '#f0a020']);
  c.fill();
  line(c, '#b0700f', 1.6);
  drawFace(c, cx, cy + 1, 0.3, 'joy');
}

// ---- the landscape behind the stage, as strips that repeat ----

const mountainY = (x: number) =>
  318 -
  48 * Math.abs(wave(x, 2 * FAR_P, 4, 0.7)) -
  20 * Math.abs(wave(x, 2 * FAR_P, 9, 2)) -
  5 * wave(x, FAR_P, 15);
const farY = (x: number) => 362 - 26 * wave(x, FAR_P, 2, 1) - 12 * wave(x, FAR_P, 6, 0.4);
const meadowY = (x: number) => 404 - 22 * wave(x, MEADOW_P, 1, 3.2) - 9 * wave(x, MEADOW_P, 3, 1.6);

// The outline of a hill: everything under y(x) from x0 to x1, down to `bottom`.
function ridge(c: Ctx, y: (x: number) => number, x0: number, x1: number, bottom: number) {
  c.beginPath();
  c.moveTo(x0, bottom);
  for (let x = x0; x <= x1; x += 8) c.lineTo(x, y(x));
  c.lineTo(x1, y(x1));
  c.lineTo(x1, bottom);
  c.closePath();
}

function drawMountains(c: Ctx) {
  ridge(c, mountainY, 0, FAR_P, GROUND);
  c.fillStyle = linear(c, 0, 245, 0, 400, ['#a5c5ea', '#cfe4f3', '#e6f3f4']);
  c.fill();
  inside(
    c,
    () => ridge(c, mountainY, 0, FAR_P, GROUND),
    () => {
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 5;
      c.beginPath();
      for (let x = 0; x <= FAR_P; x += 8) c.lineTo(x, mountainY(x) + 1);
      c.stroke();
      for (let x = 0; x <= FAR_P; x += 60) glow(c, x + 20, mountainY(x + 20) + 46, 70, '#ffffff', 0.22, 26);
    },
  );
}

// A little cottage far away, at (x, y) on its hill.
function farCottage(c: Ctx, x: number, y: number, roof: string) {
  c.fillStyle = '#fff4de';
  c.fillRect(x - 10, y - 12, 20, 12);
  c.fillStyle = 'rgba(190,170,140,0.5)';
  c.fillRect(x + 3, y - 12, 7, 12);
  c.beginPath();
  c.moveTo(x - 13, y - 11);
  c.lineTo(x, y - 23);
  c.lineTo(x + 13, y - 11);
  c.closePath();
  c.fillStyle = roof;
  c.fill();
  c.fillStyle = '#8a6a55';
  c.fillRect(x - 2, y - 7, 4, 7);
  for (let i = 0; i < 3; i++) glow(c, x + 8 + i * 5, y - 30 - i * 9, 6 + i * 2, '#ffffff', 0.5 - i * 0.12);
}

function drawFarHills(c: Ctx) {
  const rand = seeded(21);
  for (let x = 0; x < FAR_P; x += 9 + rand() * 9) {
    const r = 5 + rand() * 6,
      y = farY(x) - r * 0.25 + rand() * 3,
      fill = mix('#86c2a4', '#74b596', rand());
    repeat(FAR_P, (dx) => {
      circle(c, x + dx, y, r);
      c.fillStyle = fill;
      c.fill();
    });
  }
  ridge(c, farY, 0, FAR_P, GROUND);
  c.fillStyle = linear(c, 0, 326, 0, 440, ['#9bd0b1', '#b7dfc0', '#d2ecd0']);
  c.fill();
  inside(
    c,
    () => ridge(c, farY, 0, FAR_P, GROUND),
    () => {
      for (let i = 0; i < 120; i++) {
        const x = rand() * FAR_P,
          y = farY(x) + 6 + rand() * 46,
          r = 3 + rand() * 4;
        repeat(FAR_P, (dx) => {
          circle(c, x + dx, y, r);
          c.fillStyle = rgba('#7fbe9d', 0.55);
          c.fill();
          circle(c, x + dx - r * 0.3, y - r * 0.35, r * 0.55);
          c.fillStyle = rgba('#b9e6c4', 0.6);
          c.fill();
        });
      }
    },
  );
  for (const [x, roof] of [
    [300, '#e8806a'],
    [1180, '#7aa8e8'],
    [1560, '#e8b36a'],
  ] as const)
    farCottage(c, x, farY(x) + 3, roof);
}

function drawMeadow(c: Ctx) {
  const rand = seeded(5);
  ridge(c, meadowY, 0, MEADOW_P, GROUND);
  c.fillStyle = linear(c, 0, 374, 0, GROUND, ['#b6ea8e', '#98da75', '#84cd67']);
  c.fill();
  inside(
    c,
    () => ridge(c, meadowY, 0, MEADOW_P, GROUND),
    () => {
      // soft bushes along the far edge and flowers dotted over it
      for (let i = 0; i < 14; i++) {
        const x = rand() * MEADOW_P,
          r = 10 + rand() * 12;
        repeat(MEADOW_P, (dx) => {
          circle(c, x + dx, meadowY(x) + r * 0.5, r);
          c.fillStyle = rgba('#79c561', 0.65);
          c.fill();
          circle(c, x + dx - r * 0.3, meadowY(x) + r * 0.25, r * 0.6);
          c.fillStyle = rgba('#a8e48a', 0.6);
          c.fill();
        });
      }
      const dots = ['#ffffff', '#ffe066', '#ff9fc0', '#c7a6ff'];
      for (let i = 0; i < 240; i++) {
        const x = rand() * MEADOW_P,
          y = meadowY(x) + 8 + rand() * (GROUND - meadowY(x) - 8),
          r = 1 + rand() * 1.6,
          fill = dots[i % dots.length];
        repeat(MEADOW_P, (dx) => {
          circle(c, x + dx, y, r);
          c.fillStyle = fill;
          c.fill();
        });
      }
      c.fillStyle = linear(c, 0, GROUND - 24, 0, GROUND, ['rgba(70,140,60,0)', 'rgba(70,140,60,0.35)']);
      c.fillRect(0, GROUND - 24, MEADOW_P, 24);
    },
  );
  ridge(c, meadowY, 0, MEADOW_P, GROUND);
  line(c, '#e2fab0', 3, 0.7);
}

// A picket fence, a strip that repeats; the posts stand on the ground line.
function drawFence(c: Ctx) {
  const post = '#f1e8cc',
    shade = '#cfc29b';
  for (const y of [441, 455]) {
    c.fillStyle = shade;
    c.fillRect(0, y + 3, FENCE_P, 2.5);
    c.fillStyle = post;
    c.fillRect(0, y, FENCE_P, 3.5);
  }
  for (let x = 4; x < FENCE_P; x += 20) {
    const top = 431 + wave(x, FENCE_P, 6) * 2,
      w = 9;
    c.beginPath();
    c.moveTo(x, GROUND + 2);
    c.lineTo(x, top + 6);
    c.lineTo(x + w / 2, top);
    c.lineTo(x + w, top + 6);
    c.lineTo(x + w, GROUND + 2);
    c.closePath();
    c.fillStyle = linear(c, x, 0, x + w, 0, [post, shade]);
    c.fill();
  }
}

// Pip's cottage, by the start of the path; (0, 0) is the middle of its doorstep.
function drawCottage(c: Ctx) {
  glow(c, 0, 2, 110, '#173d1f', 0.3, 10);
  // walls
  roundRect(c, -66, -84, 132, 84, 6);
  c.fillStyle = linear(c, 0, -84, 0, 0, ['#fff8e6', '#f3e2bd']);
  c.fill();
  line(c, EARTH_LINE, 2.6);
  // timber at the corners
  for (const x of [-66, 66]) {
    roundRect(c, x - 4, -84, 8, 84, 2);
    c.fillStyle = '#b5824f';
    c.fill();
    line(c, EARTH_LINE, 1.6);
  }
  // a round green door and two windows with flower boxes
  const door = () => {
    c.beginPath();
    c.moveTo(-17, 0);
    c.lineTo(-17, -36);
    c.arc(0, -36, 17, Math.PI, 0);
    c.lineTo(17, 0);
    c.closePath();
  };
  door();
  c.fillStyle = linear(c, -17, 0, 17, 0, ['#6fcd4c', '#3f9d3a']);
  c.fill();
  door();
  line(c, LEAF_LINE, 2.6);
  circle(c, 9, -24, 2.4);
  c.fillStyle = '#ffd23f';
  c.fill();
  for (const x of [-45, 45]) {
    roundRect(c, x - 13, -66, 26, 24, 5);
    c.fillStyle = radial(c, x - 4, -58, 20, ['#fffbe0', '#ffe9a0', '#f5c96a']);
    c.fill();
    line(c, EARTH_LINE, 2);
    c.beginPath();
    c.moveTo(x, -66);
    c.lineTo(x, -42);
    c.moveTo(x - 13, -54);
    c.lineTo(x + 13, -54);
    line(c, EARTH_LINE, 1.4);
    roundRect(c, x - 15, -42, 30, 7, 2);
    c.fillStyle = '#c96a3a';
    c.fill();
    line(c, EARTH_LINE, 1.4);
    for (let i = 0; i < 4; i++) {
      circle(c, x - 11 + i * 7.3, -44, 3);
      c.fillStyle = ['#ff8fb1', '#ffd23f', '#ffffff', '#ff8fb1'][i];
      c.fill();
    }
  }
  // the roof: thatch-coloured, rounded, with a chimney
  roundRect(c, 34, -132, 16, 36, 3);
  c.fillStyle = '#c96a58';
  c.fill();
  line(c, EARTH_LINE, 2);
  const roof = () => {
    c.beginPath();
    c.moveTo(-82, -78);
    c.quadraticCurveTo(-60, -140, 0, -146);
    c.quadraticCurveTo(60, -140, 82, -78);
    c.quadraticCurveTo(0, -88, -82, -78);
    c.closePath();
  };
  roof();
  c.fillStyle = linear(c, 0, -146, 0, -78, ['#ee9a6a', '#d9714a', '#b8552e']);
  c.fill();
  inside(c, roof, () => {
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(-80, -86 - i * 10);
      c.quadraticCurveTo(0, -96 - i * 10, 80, -86 - i * 10);
      line(c, '#9a4426', 1.4, 0.4);
    }
    glow(c, -30, -128, 50, '#ffffff', 0.25, 14);
  });
  roof();
  line(c, EARTH_LINE, 2.6);
  for (let i = 0; i < 3; i++) glow(c, 46 + i * 6, -146 - i * 14, 8 + i * 3, '#ffffff', 0.55 - i * 0.14);
}

// Sunny far away over the hills, still grumpy: pale and hazy like everything that far, but his own colours.
function drawFarSunny(c: Ctx) {
  const haze = (col: string) => mix(col, '#cfe4f3', 0.35);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(-6, -60, 2, -118);
  line(c, haze('#3f8a3a'), 9);
  leaf(c, -2, -40, 30, 11, Math.PI + 0.45);
  c.fillStyle = haze('#5fbf4d');
  c.fill();
  leaf(c, 0, -62, 26, 10, -0.45);
  c.fill();
  const cx = 2,
    cy = -150,
    R = 34;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    leaf(c, cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75, 30, 11, a);
    c.fillStyle = haze(i % 2 ? '#ffd23f' : '#ffb52e');
    c.fill();
  }
  circle(c, cx, cy, R * 0.72);
  c.fillStyle = radial(c, cx - 6, cy - 6, R, [haze('#a8743f'), haze('#6b3f1c')]);
  c.fill();
  c.globalAlpha = 0.75;
  drawFace(c, cx, cy + 2, 0.9, 'angry');
  c.globalAlpha = 1;
}

export function bakeStage(scene: Scene) {
  bake(scene, 'stage-ground', TILE, GROUND_BOTTOM - GROUND_TOP, 0, -GROUND_TOP, drawGroundStrip);
  bake(scene, 'stage-ground-end', 40, GROUND_BOTTOM - GROUND_TOP, 22, -GROUND_TOP, drawGroundEnd);
  bake(scene, 'stage-pit', 100, GROUND_BOTTOM - GROUND + 2, 0, -(GROUND - 2), (c) => drawPit(c, 100));
  bake(scene, 'stage-log', 80, 50, 4, 44, (c) => drawLog(c, 70, 30));
  bake(scene, 'stage-thorns', 84, 40, 6, 36, (c) => drawThorns(c, 72));
  bake(scene, 'stage-sign', 130, 100, 64, 96, (c) => drawSign(c, 'Garden Path'));
  bake(scene, 'stage-gate', 190, 210, 95, 204, (c) => drawGate(c, "Sunny's Meadow"));
  for (let i = 0; i < BLOOMS; i++) bake(scene, `stage-bloom-${i}`, 44, 62, 22, 58, (c) => drawBloom(c, i));
  // leaf pads (the arena's, baked again so they sit on the stage's own atlas page with their stalks), in
  // every width a stage uses, and a stalk for every height they stand at
  const widths = new Set<number>(),
    drops = new Set<number>();
  for (const stage of Object.values(STAGES))
    for (const p of stage.platforms) {
      widths.add(p.w);
      drops.add(GROUND - p.y - 8);
    }
  for (const w of widths)
    bake(scene, `stage-pad-${w}`, w + 44, 48, w / 2 + 20, 15, (c) => drawLeafPlatform(c, w));
  for (const drop of drops)
    bake(scene, `stage-stalk-${drop}`, 76, drop + 8, 38, 2, (c) => drawStalk(c, drop, drop % 2 ? 12 : -10));
  bake(scene, 'stage-pad-shadow', 180, 20, 90, 10, (c) => glow(c, 0, 0, 86, '#173d1f', 0.32, 8), SOFT);

  bake(scene, 'stage-mountains', FAR_P, GROUND - LAND_TOP, 0, -LAND_TOP, drawMountains, SOFT);
  bake(scene, 'stage-far', FAR_P, GROUND - LAND_TOP, 0, -LAND_TOP, drawFarHills, SOFT);
  bake(scene, 'stage-meadow', MEADOW_P, GROUND - 366, 0, -366, drawMeadow);
  bake(scene, 'stage-fence', FENCE_P, GROUND + 4 - 428, 0, -428, drawFence);
  bake(scene, 'stage-cottage', 200, 170, 100, 160, drawCottage);
  for (let i = 0; i < HEDGES; i++)
    bake(scene, `stage-hedge-${i}`, 150, 70, 75, 64, (c) =>
      drawHedge(c, 0, 0, 120 - i * 20, 40 - i * 6, seeded(80 + i), i ? '#ff9fc0' : '#ffffff'),
    );
  bake(scene, 'stage-far-sunny', 90, 200, 45, 196, drawFarSunny, SOFT);
  bake(
    scene,
    'stage-front-grass',
    TILE,
    70,
    0,
    70,
    (c) => {
      // out-of-focus grass along the bottom of the screen, in a strip that repeats
      const rand = seeded(92);
      for (let x = 0; x < TILE; x += 4 + rand() * 5) {
        const h = 14 + rand() * 20 + Math.max(0, wave(x, TILE, 3)) * 14,
          w = 7 + rand() * 4,
          lean = (rand() - 0.5) * 16,
          fill = [mix('#12512f', '#1b6a3e', rand()), mix('#2a8850', '#44a765', rand())] as const;
        repeat(TILE, (dx) => {
          blade(c, x + dx, 4, h, w, lean);
          c.fillStyle = linear(c, 0, 0, 0, -h, [fill[0], fill[1]]);
          c.fill();
        });
      }
    },
    SOFT,
  );
}
