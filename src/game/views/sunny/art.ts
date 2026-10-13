// Sunny's parts: two rings of petals in a colour set per phase, the seed disc, his leaf "arms", the mound
// he grows from, and the little signs that float around him (the "!" bubble, sleepy z's, the angry mark).
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake, HAZY } from '../../art/bake';
import { EARTH_LINE, LEAF_LINE, mix, rgba } from '../../art/color';
import {
  circle,
  type Ctx,
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
  volume,
} from '../../art/draw';
import { bakeSunnyFaces } from './face';

export const HEAD_R = 58; // matches the simulation's weak-spot circle
const FRONT_LEN = 62, // how long a petal is in the front ring, and in the back one
  BACK_LEN = 70;
// Half the stem's width where it leaves the soil and where it meets the head.
export const STEM_HALF = [15.5, 10.5] as const;
const STEM_LEN = 64,
  STEM_EDGE = 3.2; // thickness of its outline

// One set per phase (he gets hotter as he gets grumpier), and the last for when he has cheered up.
const PETAL_SETS = [
  { base: '#ff9d1a', mid: '#ffc62e', tip: '#ffe45c', edge: '#b3600d' },
  { base: '#f06a16', mid: '#ff982c', tip: '#ffc24a', edge: '#a3440a' },
  { base: '#d63620', mid: '#f7622c', tip: '#ff9a44', edge: '#8a2210' },
  { base: '#ffb42c', mid: '#ffdc4c', tip: '#fff4a6', edge: '#c07610' },
] as const;

export const PETAL_KEYS = {
  front: PETAL_SETS.map((_, i) => `sunny-petal-front-${i}`),
  back: PETAL_SETS.map((_, i) => `sunny-petal-back-${i}`),
};

function drawPetal(c: Ctx, len: number, wid: number, set: (typeof PETAL_SETS)[number], back: boolean) {
  const tone = (color: string) => (back ? mix(color, set.edge, 0.3) : color);
  const shape = () => leaf(c, 0, 0, len, wid, 0, 0.5, 0.72);
  shape();
  c.fillStyle = linear(c, 0, 0, len, 0, [
    [0, tone(set.base)],
    [0.5, tone(set.mid)],
    [1, tone(set.tip)],
  ]);
  c.fill();
  inside(c, shape, () => {
    glow(c, len * 0.62, -wid * 0.5, len * 0.36, '#ffffff', back ? 0.2 : 0.42, wid * 0.34);
    glow(c, len * 0.5, wid * 0.75, len * 0.42, set.edge, 0.34, wid * 0.42);
    c.beginPath();
    c.moveTo(len * 0.14, 0);
    c.quadraticCurveTo(len * 0.5, 1.5, len * 0.9, 0);
    line(c, set.edge, 1.7, 0.4);
  });
  shape();
  line(c, set.edge, 3);
}

function drawDisc(c: Ctx) {
  const rand = seeded(12);
  circle(c, 0, 0, HEAD_R);
  c.fillStyle = '#5f3718';
  c.fill();
  // a ring of little florets around the rim
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      x = Math.cos(a) * 50.5,
      y = Math.sin(a) * 50.5;
    circle(c, x, y, 6.6);
    c.fillStyle = radial(c, x, y, 7, ['#b27a3e', '#7c4a20'], x - 2, y - 2.5);
    c.fill();
  }
  // the face of the disc, with seeds spiralling out from the middle
  volume(c, () => circle(c, 0, 0, 46), 0, 0, 46, 46, {
    fill: radial(c, 0, 0, 48, ['#d0934f', '#b0743a', '#8a5426'], -14, -16),
    light: 0.22,
    dark: 0.34,
  });
  for (let i = 40; i < 230; i++) {
    const r = 46 * Math.sqrt(i / 230),
      a = i * 2.39996;
    circle(c, Math.cos(a) * r, Math.sin(a) * r, 1.1 + rand() * 0.9);
    c.fillStyle = rgba('#4f2c12', 0.1 + (r / 46) * 0.3);
    c.fill();
  }
  circle(c, 0, 0, 46);
  line(c, '#4a2a12', 2, 0.55);
  // rim light and the outline
  c.beginPath();
  c.arc(0, 0, HEAD_R - 3.5, Math.PI * 1.02, Math.PI * 1.55);
  line(c, '#f2c088', 2.6, 0.6);
  circle(c, 0, 0, HEAD_R);
  line(c, '#3a2010', 4);
}

// A stem leaf pointing right from where it joins the stem at (0, 0).
function drawLeaf(c: Ctx) {
  const shape = () => leaf(c, 0, 0, 84, 25, 0, 0.42, 0.86);
  shape();
  c.fillStyle = linear(c, 0, 0, 84, 0, ['#3d9c3b', '#6ccd50', '#aaec7a']);
  c.fill();
  inside(c, shape, () => {
    glow(c, 46, -11, 34, '#ffffff', 0.34, 8);
    glow(c, 40, 15, 40, '#17602b', 0.36, 9);
    c.beginPath();
    c.moveTo(4, 0);
    c.quadraticCurveTo(44, 2, 80, 0);
    line(c, '#dcf9a8', 2.4, 0.95);
    for (let i = 1; i < 6; i++) {
      const x = 8 + i * 12,
        reach = 14 - Math.abs(i - 3) * 2.2;
      c.beginPath();
      c.moveTo(x, 0.6);
      c.quadraticCurveTo(x + 7, -reach * 0.5, x + 13, -reach);
      c.moveTo(x, 0.6);
      c.quadraticCurveTo(x + 7, reach * 0.5, x + 13, reach);
      line(c, '#d2f59a', 1.4, 0.6);
    }
  });
  shape();
  line(c, LEAF_LINE, 3.2);
}

function drawSoil(c: Ctx) {
  const rand = seeded(14);
  glow(c, 0, 9, 62, '#2a1608', 0.4, 9);
  volume(c, () => ellipse(c, 0, 0, 50, 13), 0, 0, 50, 13, {
    fill: linear(c, 0, -13, 0, 13, ['#b87a48', '#8a5530']),
    stroke: EARTH_LINE,
    width: 3,
    light: 0.3,
    dark: 0.3,
  });
  for (let i = 0; i < 9; i++) {
    const x = -38 + rand() * 76,
      y = -5 + rand() * 9;
    ellipse(c, x, y, 3 + rand() * 3, 2 + rand() * 1.5);
    c.fillStyle = i % 2 ? 'rgba(74,42,20,0.5)' : 'rgba(226,170,116,0.6)';
    c.fill();
  }
}

export function bakeSunny(scene: Scene) {
  PETAL_SETS.forEach((set, i) => {
    bake(scene, PETAL_KEYS.front[i], FRONT_LEN + 8, 40, 4, 20, (c) =>
      drawPetal(c, FRONT_LEN, 16.5, set, false),
    );
    bake(scene, PETAL_KEYS.back[i], BACK_LEN + 8, 42, 4, 21, (c) => drawPetal(c, BACK_LEN, 17.5, set, true));
  });
  bake(scene, 'sunny-disc', 128, 128, 64, 64, drawDisc);
  bake(scene, 'sunny-flash', 128, 128, 64, 64, (c) => {
    c.fillStyle = radial(c, 0, 0, HEAD_R + 4, [
      [0, 'rgba(255,255,255,1)'],
      [0.8, 'rgba(255,255,255,0.9)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    c.fillRect(-64, -64, 128, 128);
  });
  // The stem, laid out straight with the soil end on the left; SunnyView bends it along a curve as a
  // ribbon. The top of the strip becomes his left side, the lit one.
  bake(scene, 'sunny-stem', STEM_LEN, 40, 0, 20, (c) => {
    // a band along the stem between two offsets across it (-1 = lit edge, 1 = shaded edge)
    const band = (from: number, to: number, extra: number, color: string) => {
      const [soil, head] = STEM_HALF;
      c.beginPath();
      c.moveTo(0, from * soil - extra);
      c.lineTo(STEM_LEN, from * head - extra);
      c.lineTo(STEM_LEN, to * head + extra);
      c.lineTo(0, to * soil + extra);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    };
    band(-1, 1, STEM_EDGE, LEAF_LINE);
    band(-1, 1, 0, '#57b847');
    band(0.35, 1, 0, '#3f9a3c');
    band(-0.72, -0.3, 0, '#a5e878');
  });
  bake(scene, 'sunny-leaf', 100, 64, 8, 32, drawLeaf);
  bake(scene, 'sunny-soil', 132, 46, 66, 20, drawSoil);
  // warm light behind his head; it swells when he cheers up
  bake(
    scene,
    'sunny-halo',
    420,
    420,
    210,
    210,
    (c) => {
      c.fillStyle = radial(c, 0, 0, 210, [
        [0, 'rgba(255,238,160,0.9)'],
        [0.45, 'rgba(255,224,120,0.45)'],
        [1, 'rgba(255,214,100,0)'],
      ]);
      c.fillRect(-210, -210, 420, 420);
    },
    HAZY,
  );
  bakeSunnyFaces(scene);

  // "!" bubble = an attack is coming; the tail points down at Sunny
  bake(scene, 'warn-bubble', 64, 76, 32, 34, (c) => {
    const shape = () => {
      roundRect(c, -25, -28, 50, 52, 17);
      c.moveTo(4, 22);
      c.lineTo(20, 38);
      c.lineTo(17, 18);
      c.closePath();
    };
    glow(c, 2, 4, 34, '#5a1a00', 0.3);
    // outline first, twice as wide, then the fill covers its inner half (and the join with the tail)
    shape();
    line(c, '#ff7a1a', 9);
    shape();
    c.fillStyle = linear(c, 0, -28, 0, 26, ['#ffffff', '#ffeecd']);
    c.fill();
    c.fillStyle = '#ff4d2e';
    c.strokeStyle = '#a82408';
    c.lineWidth = 2.5;
    c.font = `bold 44px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText('!', 0, 0);
    c.fillText('!', 0, 0);
  });
  bake(scene, 'zzz', 32, 36, 16, 18, (c) => {
    c.font = `bold 28px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = '#3d5f8f';
    c.strokeText('z', 0, 0);
    c.fillStyle = '#eaf6ff';
    c.fillText('z', 0, 0);
  });
  // the bubble he blows while asleep, hanging from (0, 0)
  bake(scene, 'sunny-bubble', 48, 48, 24, 4, (c) => {
    circle(c, 0, 20, 19);
    c.fillStyle = radial(
      c,
      0,
      20,
      20,
      ['rgba(255,255,255,0.75)', 'rgba(190,230,255,0.45)', 'rgba(150,205,250,0.7)'],
      -6,
      12,
    );
    c.fill();
    line(c, '#6fb2e6', 2);
    ellipse(c, -7, 12, 4.5, 2.6, -0.6);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fill();
  });
  // the cross-shaped "so angry" mark
  bake(scene, 'sunny-vein', 34, 34, 17, 17, (c) => {
    for (const width of [7, 3.6]) {
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        c.save();
        c.rotate((i / 4) * TAU);
        c.moveTo(4, -12);
        c.quadraticCurveTo(4, -4, 12, -4);
        c.restore();
      }
      line(c, width > 5 ? '#8a1408' : '#ff5a3c', width);
    }
  });
}
