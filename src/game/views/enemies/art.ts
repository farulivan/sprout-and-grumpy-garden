// The small enemies' parts. They are garden plants in a mood, drawn like everything that can hurt (README
// "How it looks"): dark outlines, strong colour, one light from the top left, and the shared little face,
// frowning. Their views (EnemyViews.ts) move these parts.
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake } from '../../art/bake';
import { EARTH_LINE, LEAF_LINE } from '../../art/color';
import { circle, ellipse, glow, inside, leaf, line, linear, radial, seeded, type Ctx } from '../../art/draw';
import { bakeFaces } from '../faces';

// ---- Grumbud: a flower bud on two root feet ----

// The bud, its point up; (0, 0) is where it stands. About 46 tall.
function drawBud(c: Ctx) {
  // the stem it grows from, and the sepals cupping it
  c.beginPath();
  c.moveTo(0, -2);
  c.lineTo(0, -10);
  line(c, LEAF_LINE, 6);
  c.beginPath();
  c.moveTo(0, -2);
  c.lineTo(0, -10);
  line(c, '#5fbf4d', 3);
  const bud = () => {
    c.beginPath();
    c.moveTo(0, -46);
    c.bezierCurveTo(14, -36, 19, -22, 16, -14);
    c.bezierCurveTo(13, -6, -13, -6, -16, -14);
    c.bezierCurveTo(-19, -22, -14, -36, 0, -46);
    c.closePath();
  };
  bud();
  c.fillStyle = radial(c, -5, -30, 26, ['#ffc2d6', '#ff6f9a', '#d93a6e'], -6, -32);
  c.fill();
  inside(c, bud, () => {
    // two petals wrapped around each other
    c.beginPath();
    c.moveTo(-14, -18);
    c.bezierCurveTo(-6, -30, 4, -38, 2, -46);
    line(c, '#b52a5c', 2, 0.8);
    c.beginPath();
    c.moveTo(15, -16);
    c.bezierCurveTo(8, -24, 2, -28, -2, -40);
    line(c, '#b52a5c', 1.6, 0.55);
    glow(c, -6, -34, 9, '#ffffff', 0.5, 6);
  });
  bud();
  line(c, '#7a1d42', 2.6);
  for (const [a, len] of [
    [-2.35, 14],
    [-0.8, 14],
    [-1.57, 12],
  ] as const) {
    leaf(c, 0, -9, len, 6, a);
    c.fillStyle = linear(c, -10, -16, 10, -6, ['#9be36b', '#4fa83c']);
    c.fill();
    line(c, LEAF_LINE, 2);
  }
}

function drawRootFoot(c: Ctx) {
  ellipse(c, 0, 0, 7.5, 4.6);
  c.fillStyle = linear(c, 0, -4, 0, 4, ['#c99360', '#8a5a30']);
  c.fill();
  line(c, EARTH_LINE, 2.2);
  c.beginPath();
  c.moveTo(5, 1);
  c.quadraticCurveTo(10, 3, 12, 1);
  line(c, EARTH_LINE, 1.6);
}

// ---- Puffball: a dandelion clock ----

function drawPuff(c: Ctx) {
  const rand = seeded(61);
  glow(c, 0, 0, 30, '#e8e2ff', 0.7);
  // the seed parachutes, all the way round
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * TAU + rand() * 0.1,
      r = 15 + rand() * 4;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    c.beginPath();
    c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
    c.lineTo(x, y);
    line(c, '#9a8cd0', 1.2);
    for (let k = -2; k <= 2; k++) {
      const b = a + k * 0.32;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(b) * 5.5, y + Math.sin(b) * 5.5);
      line(c, '#ffffff', 1.4, 0.95);
    }
  }
  circle(c, 0, 0, 16);
  c.fillStyle = radial(c, -4, -5, 18, ['#ffffff', '#e9e3ff', '#bdb0ea']);
  c.fill();
  circle(c, 0, 0, 16);
  line(c, '#4c3d8f', 2.6);
  inside(
    c,
    () => circle(c, 0, 0, 16),
    () => glow(c, -5, -6, 8, '#ffffff', 0.8),
  );
}

// ---- Pea Pod: a pea plant with one fat pod ----

// The vine, from the ground at (0, 0) up to where the pod hangs, about 40 up.
function drawVine(c: Ctx) {
  const path = () => {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-8, -14, 9, -24, 2, -38);
  };
  path();
  line(c, LEAF_LINE, 7);
  path();
  line(c, '#5fbf4d', 3.6);
  for (const [y, side] of [
    [-12, 1],
    [-24, -1],
  ] as const) {
    leaf(c, 0, y, 16, 6, side > 0 ? -0.4 : Math.PI + 0.4);
    c.fillStyle = linear(c, -16, y, 16, y, ['#9be36b', '#58b548']);
    c.fill();
    line(c, LEAF_LINE, 1.8);
  }
  // a curl of tendril
  c.beginPath();
  c.moveTo(1, -30);
  c.bezierCurveTo(14, -30, 16, -42, 9, -43);
  c.bezierCurveTo(4, -43, 5, -37, 8, -38);
  line(c, '#3f9d3a', 1.6);
}

// The pod, lying on its side with its mouth at the left; (0, 0) is its middle. open: the mouth gapes.
function drawPod(c: Ctx, open: boolean) {
  const pod = () => {
    c.beginPath();
    c.moveTo(-22, -2);
    c.bezierCurveTo(-18, -16, 14, -17, 24, -4);
    c.bezierCurveTo(26, 0, 22, 9, 14, 11);
    c.bezierCurveTo(4, 14, -14, 12, -20, 5);
    c.closePath();
  };
  pod();
  c.fillStyle = radial(c, -4, -8, 26, ['#c8f28a', '#7cc644', '#4f9a2f'], -6, -9);
  c.fill();
  inside(c, pod, () => {
    // the bumps of the peas inside
    for (const x of [-8, 3, 13]) glow(c, x, -3, 8, '#e8ffc0', 0.45, 6);
    c.beginPath();
    c.moveTo(-20, 4);
    c.bezierCurveTo(-6, 10, 10, 10, 22, 2);
    line(c, '#2c5e1c', 1.4, 0.5);
  });
  pod();
  line(c, '#2c5e1c', 2.6);
  // the mouth at its tip
  ellipse(c, -21, 0.5, open ? 5 : 2.4, open ? 6 : 3.5);
  c.fillStyle = open ? '#2c3b14' : '#3f7a2a';
  c.fill();
  line(c, '#2c5e1c', 1.8);
  if (open) {
    circle(c, -21, 1, 3.4);
    c.fillStyle = '#9ad85f';
    c.fill();
  }
  // a stalk where it hangs from the vine
  c.beginPath();
  c.moveTo(14, -12);
  c.quadraticCurveTo(16, -18, 20, -20);
  line(c, LEAF_LINE, 3);
}

// ---- Snapper: a snapdragon hiding in a mound ----

// The flower head, its jaws to the left; (0, 0) is where the stem meets it. open: jaws apart.
function drawSnapHead(c: Ctx, open: boolean) {
  const gape = open ? 0.42 : 0.06;
  const jaw = (upper: boolean) => {
    const s = upper ? -1 : 1,
      a = s * gape;
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(6, 0);
    c.bezierCurveTo(4, s * 22, -26, s * 20, -28, s * 4);
    c.lineTo(6, 0);
    c.closePath();
    c.fillStyle = upper
      ? radial(c, -8, -12, 26, ['#f2b3ff', '#c45ce0', '#8a2fb0'], -10, -14)
      : radial(c, -8, 8, 22, ['#e79cf6', '#a845c9', '#7a2598']);
    c.fill();
    line(c, '#4a1663', 2.6);
    // teeth along the edge
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const x = -22 + i * 6;
      c.beginPath();
      c.moveTo(x, s * 3);
      c.lineTo(x + 2.4, s * 8);
      c.lineTo(x + 4.8, s * 3);
      c.closePath();
      c.fill();
      line(c, '#4a1663', 1);
    }
    c.restore();
  };
  // the yellow throat, seen between the jaws
  ellipse(c, -8, 0, 13, 4 + gape * 14);
  c.fillStyle = '#ffd23f';
  c.fill();
  line(c, '#a06a00', 1.6);
  jaw(false);
  jaw(true);
  // the green cup behind the flower, where the stem meets it
  for (const a of [-0.6, 0.6]) {
    leaf(c, 4, 0, 12, 5, a);
    c.fillStyle = '#5fbf4d';
    c.fill();
    line(c, LEAF_LINE, 1.6);
  }
}

// The stem it pops up on, a straight green stalk from (0, 0) down; stretched to length by the view.
function drawSnapStem(c: Ctx) {
  c.fillStyle = linear(c, -4, 0, 4, 0, ['#9be36b', '#4fa83c']);
  c.fillRect(-4, 0, 8, 40);
  c.fillStyle = 'rgba(28,95,42,0.9)';
  c.fillRect(-5, 0, 1.6, 40);
  c.fillRect(3.4, 0, 1.6, 40);
}

export function bakeEnemies(scene: Scene) {
  bake(scene, 'grumbud-body', 46, 52, 23, 50, drawBud);
  bake(scene, 'grumbud-foot', 30, 14, 10, 7, drawRootFoot);
  bake(scene, 'puff-head', 70, 70, 35, 35, drawPuff);
  bake(scene, 'pea-vine', 50, 52, 20, 48, drawVine);
  bake(scene, 'pea-pod', 60, 40, 30, 20, (c) => drawPod(c, false));
  bake(scene, 'pea-pod-open', 60, 40, 30, 20, (c) => drawPod(c, true));
  bake(scene, 'snap-head', 64, 56, 40, 28, (c) => drawSnapHead(c, false));
  bake(scene, 'snap-head-open', 64, 56, 40, 28, (c) => drawSnapHead(c, true));
  bake(scene, 'snap-stem', 12, 40, 6, 0, drawSnapStem);
  bakeFaces(scene, 'grumbud', 0.52, ['angry', 'surprised']);
  bakeFaces(scene, 'puff', 0.42, ['angry', 'surprised']);
  bakeFaces(scene, 'pod', 0.42, ['angry', 'surprised']);
  bakeFaces(scene, 'snap', 0.4, ['angry']);
}
