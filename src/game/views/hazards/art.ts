// The hazards' parts: the vine, the root spike, the pollen ball, and the warnings that come before them.
// HazardViews.ts moves them.
import type { Scene } from 'phaser';
import { GROUND, TAU } from '../../../config';
import { VineSweep } from '../../../sim/hazards';
import { bake, SOFT } from '../../art/bake';
import { EARTH_LINE, LEAF_LINE } from '../../art/color';
import {
  blob,
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
  volume,
  type Ctx,
} from '../../art/draw';
import { drawFace } from '../../art/face';

// The vine is drawn longer than the part of it that hurts: a tail trails behind, ending in a round tip.
const VINE = new VineSweep(),
  VINE_TAIL = 56,
  VINE_HALF = (VINE.h - 6) / 2; // half its thickness, outline included
export const VINE_LEN = VINE.w + VINE_TAIL + VINE_HALF,
  VINE_POINTS = Math.round(VINE_LEN / 10) + 1; // the points its ribbon bends at

// A heap of pushed-up earth with its base on y = 0.
function drawMound(c: Ctx, w: number, h: number, rand01: () => number) {
  const shape = () => {
    c.beginPath();
    c.moveTo(-w / 2, 3);
    c.bezierCurveTo(-w * 0.4, -h * 0.9, -w * 0.12, -h, 0, -h);
    c.bezierCurveTo(w * 0.16, -h, w * 0.4, -h * 0.8, w / 2, 3);
    c.closePath();
  };
  volume(c, shape, 0, -h * 0.4, w / 2, h * 0.7, {
    fill: linear(c, 0, -h, 0, 3, ['#c48a56', '#8a5530']),
    stroke: EARTH_LINE,
    width: 3,
    light: 0.3,
    dark: 0.3,
  });
  inside(c, shape, () => {
    for (let i = 0; i < 6; i++) {
      ellipse(c, (rand01() - 0.5) * w * 0.7, -rand01() * h * 0.7, 2 + rand01() * 3, 1.5 + rand01() * 2);
      c.fillStyle = i % 2 ? 'rgba(74,42,20,0.45)' : 'rgba(232,180,128,0.6)';
      c.fill();
    }
  });
}

export function bakeHazards(scene: Scene) {
  // ---- shared ----
  bake(scene, 'warn-mark', 34, 34, 17, 17, (c) => {
    glow(c, 1, 2, 16, '#5a1a00', 0.35);
    circle(c, 0, 0, 11.5);
    line(c, '#ff7a1a', 7);
    circle(c, 0, 0, 11.5);
    c.fillStyle = linear(c, 0, -12, 0, 12, ['#ffffff', '#ffeecd']);
    c.fill();
    c.fillStyle = '#ff4d2e';
    c.font = `bold 21px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('!', 0, 1);
  });
  bake(scene, 'dirt-mound', 104, 40, 52, 32, (c) => drawMound(c, 92, 26, seeded(51)));
  bake(scene, 'dirt-clod', 14, 14, 7, 7, (c) => {
    blob(c, 0, 0, 4.4, seeded(52), 7, 0.3);
    c.fillStyle = radial(c, 0, 0, 5, ['#c48a56', '#7a4a28'], -1.5, -1.5);
    c.fill();
    line(c, EARTH_LINE, 1.4);
  });

  // ---- vine ----
  // Its body laid out straight, head end on the left, round tip of the tail on the right. VineView
  // bends it into a wave as a ribbon.
  bake(scene, 'vine-body', VINE_LEN, VINE.h, 0, VINE.h / 2, (c) => {
    const inner = VINE_HALF - 3.5,
      body = () => roundRect(c, -40, -inner, VINE_LEN + 40 - 3.5, inner * 2, inner);
    roundRect(c, -40, -VINE_HALF, VINE_LEN + 40, VINE_HALF * 2, VINE_HALF);
    c.fillStyle = LEAF_LINE;
    c.fill();
    body();
    c.fillStyle = '#4caf45';
    c.fill();
    inside(c, body, () => {
      c.fillStyle = '#2f8a3a'; // shaded belly
      c.fillRect(-40, 3, VINE_LEN + 40, 6);
      c.fillStyle = '#9be36b'; // sunlit back
      c.fillRect(-40, -7.75, VINE_LEN + 40, 4.5);
    });
  });
  bake(scene, 'vine-leaf', 34, 24, 5, 12, (c) => {
    const shape = () => leaf(c, 0, 0, 25, 9, 0, 0.5, 0.8);
    shape();
    c.fillStyle = linear(c, 0, 0, 25, 0, ['#4caf45', '#a5e878']);
    c.fill();
    inside(c, shape, () => glow(c, 14, -5, 11, '#ffffff', 0.4, 4));
    shape();
    line(c, LEAF_LINE, 2.6);
    c.beginPath();
    c.moveTo(3, 0);
    c.lineTo(20, 0);
    line(c, '#e0fbb0', 1.3, 0.8);
  });
  // a thorn pointing up from (0, 0)
  bake(scene, 'vine-thorn', 16, 18, 8, 15, (c) => {
    c.beginPath();
    c.moveTo(-5.5, 1);
    c.quadraticCurveTo(-1.5, -4, 0.5, -12);
    c.quadraticCurveTo(2.5, -4, 5.5, 1);
    c.closePath();
    c.fillStyle = linear(c, -5, 0, 5, 0, ['#fff7d0', '#e2c98c']);
    c.fill();
    line(c, LEAF_LINE, 2.2);
  });
  // the vine's head leads the way, facing left
  bake(scene, 'vine-head', 66, 58, 34, 30, (c) => {
    for (const [rot, len] of [
      [-0.7, 24],
      [-0.2, 27],
      [0.35, 23],
    ] as const) {
      leaf(c, 6, 0, len, 8.5, rot, 0.5, 0.8);
      c.fillStyle = linear(c, 6, 0, 30, 0, ['#3d9a3c', '#7fd65a']);
      c.fill();
      line(c, LEAF_LINE, 2.6);
    }
    volume(c, () => circle(c, 0, 0, 19), 0, 0, 19, 19, {
      fill: radial(c, 0, 0, 21, ['#bdf086', '#6cc551', '#3f9a3c'], -6, -7),
      stroke: LEAF_LINE,
      width: 3,
      light: 0.3,
      dark: 0.34,
      shade: '#0f4a22',
    });
    drawFace(c, -3, 1, 0.84, 'angry');
  });

  // ---- root: drawn at full height with (0, 0) on the ground line ----
  bake(scene, 'root-spike', 84, 136, 42, 126, (c) => {
    const twig = (x: number, y: number, rot: number, len: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.beginPath();
      c.moveTo(0, -5);
      c.quadraticCurveTo(len * 0.6, -4, len, 0);
      c.quadraticCurveTo(len * 0.6, 3, 0, 5);
      c.closePath();
      c.restore();
      c.fillStyle = '#a8703e';
      c.fill();
      line(c, '#3d2414', 2.6);
    };
    twig(-11, -36, Math.PI + 0.75, 22);
    twig(9, -58, -0.7, 20);
    const shape = () => {
      c.beginPath();
      c.moveTo(-24, 6);
      c.bezierCurveTo(-20, -30, -4, -62, 3, -99);
      c.bezierCurveTo(8, -64, 12, -32, 24, 6);
      c.closePath();
    };
    shape();
    c.fillStyle = linear(c, -22, 0, 22, 0, ['#e0ae76', '#a8703e', '#6e4426']);
    c.fill();
    inside(c, shape, () => {
      // the grain of the wood, twisting around the root
      for (let i = 0; i < 7; i++) {
        const y = -6 - i * 14;
        c.beginPath();
        c.moveTo(-26, y + 6);
        c.quadraticCurveTo(0, y - 9, 26, y - 2);
        line(c, '#5a361c', 2, 0.42);
      }
      glow(c, -8, -44, 15, '#fff0d0', 0.42, 48);
    });
    shape();
    line(c, '#3d2414', 3);
    // a sprig at the tip
    for (const rot of [-2.3, -0.9]) {
      leaf(c, 3, -98, 13, 4.6, rot, 0.5, 0.8);
      c.fillStyle = '#8ade5c';
      c.fill();
      line(c, LEAF_LINE, 2);
    }
  });
  bake(scene, 'root-mound', 84, 28, 42, 21, (c) => drawMound(c, 72, 14, seeded(53)));
  bake(scene, 'root-crack', 78, 18, 39, 9, (c) => {
    c.beginPath();
    c.moveTo(-34, 1);
    c.lineTo(-20, -3);
    c.lineTo(-9, 3);
    c.lineTo(2, -4);
    c.lineTo(13, 2);
    c.lineTo(23, -2);
    c.lineTo(34, 2);
    c.moveTo(-9, 3);
    c.lineTo(-14, 7);
    c.moveTo(13, 2);
    c.lineTo(18, 7);
    line(c, '#2f1a0c', 3);
    line(c, '#8a5530', 1.2);
  });

  // ---- pollen ----
  // where a pollen ball is about to land
  bake(scene, 'pollen-target', 76, 30, 38, 15, (c) => {
    ellipse(c, 0, 0, 31, 10);
    c.fillStyle = 'rgba(255,196,60,0.38)';
    c.fill();
    line(c, '#7a3d00', 5.5, 0.55);
    line(c, '#ffb01f', 3.2);
    ellipse(c, 0, 0, 17, 5.5);
    line(c, '#fff0a8', 2, 0.9);
  });
  // a faint column of light showing its path down; (0, 0) is where it meets the ground
  bake(
    scene,
    'pollen-beam',
    44,
    GROUND,
    22,
    GROUND,
    (c) => {
      c.fillStyle = linear(c, -22, 0, 22, 0, [
        'rgba(255,226,120,0)',
        'rgba(255,226,120,0.8)',
        'rgba(255,226,120,0)',
      ]);
      c.fillRect(-22, -GROUND, 44, GROUND);
      c.globalCompositeOperation = 'destination-in';
      c.fillStyle = linear(c, 0, -GROUND, 0, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']);
      c.fillRect(-22, -GROUND, 44, GROUND);
      c.globalCompositeOperation = 'source-over';
    },
    SOFT,
  );
  bake(scene, 'pollen-ball', 40, 40, 20, 20, (c) => {
    // a fuzzy ball: a ring of little bumps around a bright middle
    const fuzz = () => {
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        c.moveTo(Math.cos(a) * 11.5 + 4.2, Math.sin(a) * 11.5);
        c.arc(Math.cos(a) * 11.5, Math.sin(a) * 11.5, 4.2, 0, TAU);
      }
      c.moveTo(12, 0);
      c.arc(0, 0, 12, 0, TAU);
    };
    fuzz();
    line(c, '#a66a06', 4.4);
    fuzz();
    c.fillStyle = radial(c, 0, 0, 16, ['#fffbd6', '#ffe36a', '#f5b21c'], -4, -5);
    c.fill();
    circle(c, -4, -5, 3);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fill();
  });
  bake(scene, 'pollen-glow', 84, 84, 42, 42, (c) => glow(c, 0, 0, 41, '#ffe680', 0.8), SOFT);
  bake(
    scene,
    'pollen-puff',
    52,
    48,
    26,
    24,
    (c) => {
      for (const [x, y, r] of [
        [-8, 4, 13],
        [8, 4, 13],
        [0, -6, 14],
      ]) {
        circle(c, x, y, r);
        c.fillStyle = radial(c, x, y, r, ['#fff8c8', '#ffe066', 'rgba(245,190,40,0.75)'], x - 3, y - 4);
        c.fill();
      }
    },
    SOFT,
  );
}
