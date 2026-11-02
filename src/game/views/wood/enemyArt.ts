// The Mushroom Wood's small enemies, drawn like everything that can hurt (README "How it looks"): dark outlines,
// strong colour, one light from the top left, and the shared little face, frowning. Their views are in
// ../EnemyViews.ts. They are baked with the rest of the wood, the first time the chapter is played.
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake, SOFT } from '../../art/bake';
import { circle, ellipse, glow, inside, line, linear, radial, type Ctx } from '../../art/draw';
import { drawFace } from '../../art/face';
import { bakeFaces } from '../faces';
import { drawMushroom } from './art';

const PEN = '#2c1033';

// Capling: a stubby sulking mushroom, in Mo's blue.
function drawCapling(c: Ctx) {
  glow(c, 0, 2, 26, '#0b0a2a', 0.45, 5);
  drawMushroom(c, 52, 44, ['#c6d8ff', '#6a7fe8', '#3a3aa8'], { outline: PEN, pen: 2.8, spots: 4 });
}

// ...and cheered up: the same mushroom a size wider, bright gold and beaming, with a spring in it.
function drawPad(c: Ctx) {
  glow(c, 0, -28, 48, '#ffdf7a', 0.6);
  glow(c, 0, 2, 32, '#0b0a2a', 0.4, 5);
  drawMushroom(c, 72, 42, ['#fff6c4', '#ffc84a', '#e0822a'], {
    outline: '#6a3210',
    pen: 2.8,
    stalk: ['#fff8e6', '#e6cda8'],
    spots: 5,
  });
  drawFace(c, 0, -12, 0.44, 'joy');
}

// Burr: a seed head all over hooked spikes; (0, 0) is its middle.
function drawBurrBall(c: Ctx) {
  const n = 16,
    spike = (a: number, r0: number, r1: number) => {
      const bx = Math.cos(a) * r0,
        by = Math.sin(a) * r0,
        tx = Math.cos(a + 0.12) * r1,
        ty = Math.sin(a + 0.12) * r1;
      c.beginPath();
      c.moveTo(bx + Math.cos(a + 1.57) * 4, by + Math.sin(a + 1.57) * 4);
      c.quadraticCurveTo(tx * 0.9, ty * 0.9, tx, ty);
      c.quadraticCurveTo(tx * 0.82, ty * 0.82, bx - Math.cos(a + 1.57) * 4, by - Math.sin(a + 1.57) * 4);
      c.closePath();
    };
  for (let i = 0; i < n; i++) {
    spike((i / n) * TAU, 14, 25);
    c.fillStyle = linear(c, -20, -20, 20, 20, ['#ffe9b0', '#d99a3e']);
    c.fill();
    line(c, '#40200a', 1.8);
  }
  const body = () => circle(c, 0, 0, 16.5);
  body();
  c.fillStyle = radial(c, 0, 0, 18, ['#e6b860', '#a86a26', '#6a3c12'], -6, -7);
  c.fill();
  inside(c, body, () => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.2,
        r = 5 + (i % 3) * 3.5;
      c.beginPath();
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      line(c, '#4a2810', 1.6, 0.7);
    }
    glow(c, -6, -7, 8, '#ffffff', 0.55);
  });
  body();
  line(c, '#40200a', 2.6);
}

// Dropcap: a little red mushroom on a thread; (0, 0) is its middle.
function drawDropcap(c: Ctx) {
  c.translate(0, 19);
  drawMushroom(c, 40, 38, ['#ffc2ae', '#f0543e', '#a81e2c'], { outline: PEN, pen: 2.6, spots: 4 });
}

// Toadlet: a squat toadstool on two big feet, always about to jump; (0, 0) is where it stands.
function drawToadlet(c: Ctx) {
  glow(c, 0, 2, 24, '#0b0a2a', 0.4, 4);
  for (const side of [-1, 1]) {
    ellipse(c, side * 13, -3, 10, 5, side * 0.15);
    c.fillStyle = linear(c, 0, -8, 0, 2, ['#c8f28a', '#6aae3c']);
    c.fill();
    line(c, '#1c4a22', 2.2);
  }
  drawMushroom(c, 46, 38, ['#d4f79a', '#6cc04a', '#2a7c44'], {
    outline: '#123c28',
    pen: 2.8,
    stalk: ['#fff0c8', '#dcc08a'],
    spots: 4,
  });
}

export function bakeWoodEnemies(scene: Scene) {
  bake(scene, 'capling-body', 64, 58, 32, 52, drawCapling);
  bake(scene, 'capling-happy', 120, 96, 60, 84, drawPad);
  bake(scene, 'burr-body', 60, 60, 30, 30, drawBurrBall);
  bake(scene, 'burr-star', 18, 18, 9, 9, (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2,
        r = i % 2 ? 3 : 7;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = '#ffe66d';
    c.fill();
    line(c, '#8a5f24', 1.3);
  });
  bake(scene, 'dropcap-body', 50, 46, 25, 23, drawDropcap);
  // the thread a Dropcap hangs by, up off the top of the screen
  bake(
    scene,
    'dropcap-thread',
    8,
    320,
    4,
    320,
    (c) => {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -320);
      line(c, 'rgba(240,240,225,0.75)', 1.6);
    },
    SOFT,
  );
  bake(scene, 'toadlet-body', 62, 50, 31, 44, drawToadlet);
  // an orange ring on the ground where a hop will come down, as for anything that lands
  bake(scene, 'toadlet-spot', 72, 22, 36, 11, (c) => {
    glow(c, 0, 0, 34, '#ff8a1f', 0.3, 9);
    ellipse(c, 0, 0, 29, 7);
    line(c, '#ff8a1f', 3);
    ellipse(c, 0, 0, 29, 7);
    line(c, '#ffd9a0', 1.1);
  });
  bakeFaces(scene, 'capling', 0.42, ['angry']);
  bakeFaces(scene, 'burr', 0.42, ['angry', 'worried']);
  bakeFaces(scene, 'dropcap', 0.36, ['angry', 'surprised']);
  bakeFaces(scene, 'toadlet', 0.4, ['angry', 'surprised']);
}
