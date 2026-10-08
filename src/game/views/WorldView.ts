// The arena: sky, sun, drifting clouds, hills, trees, the ground and the leaf platforms.
// Everything that never changes is baked into three big layers; the rest are small moving parts.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, H, W } from '../../config';
import { platforms } from '../../sim/arena';
import { bake, INV, part, show } from '../art/bake';
import { circle, ellipse, fillStroke, roundRect } from '../art/draw';
import { bakeFaces, faceKey } from './faces';

const CLOUDS = Array.from({ length: 6 }, (_, i) => ({
  x: i * 190 + 40,
  y: 50 + (i % 3) * 38,
  s: 0.7 + (i % 3) * 0.25,
  v: 12 + (i % 2) * 8,
}));
const FLOWERS = Array.from({ length: 22 }, (_, i) => ({
  x: 20 + i * 44 + ((i * 37) % 23),
  c: ['#ff8fb1', '#ffd66b', '#b48cff', '#ff9f68', '#8fd8ff'][i % 5],
  h: 10 + ((i * 13) % 12),
}));
const TREES = [
  [80, 1],
  [220, 0.8],
  [880, 0.9],
  [640, 0.7],
  [420, 0.75],
] as const; // [x, size]
const HILLS_TOP = GROUND - 126;
const GROUND_TOP = GROUND - 34; // the tallest flower pokes this far above the ground line

export function bakeWorld(scene: Scene) {
  bake(scene, 'bg-sky', W, H, 0, 0, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#9fd8ff');
    sky.addColorStop(1, '#eaf8ff');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    const glow = c.createRadialGradient(130, 90, 20, 130, 90, 110);
    glow.addColorStop(0, 'rgba(255,240,170,0.9)');
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, 300, 250);
    circle(c, 130, 90, 42);
    fillStroke(c, '#ffe985', '#f5c542', 4);
  });
  bakeFaces(scene, 'sun', 1.3, ['happy']);
  bake(scene, 'cloud', 112, 84, 30, 44, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [dx, dy, r] of [
      [0, 0, 26],
      [24, -10, 30],
      [52, 0, 24],
      [26, 10, 26],
    ]) {
      circle(c, dx, dy, r);
      c.fill();
    }
  });
  bake(scene, 'bg-hills', W, GROUND - HILLS_TOP, 0, -HILLS_TOP, (c) => {
    c.fillStyle = '#bfe8a6';
    c.beginPath();
    c.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 20)
      c.lineTo(x, GROUND - 70 - Math.sin(x * 0.006 + 1) * 40 - Math.sin(x * 0.02) * 12);
    c.lineTo(W, GROUND);
    c.closePath();
    c.fill();
    c.fillStyle = '#a2dc8a';
    c.beginPath();
    c.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 20)
      c.lineTo(x, GROUND - 30 - Math.sin(x * 0.009 + 3) * 28 - Math.cos(x * 0.03) * 6);
    c.lineTo(W, GROUND);
    c.closePath();
    c.fill();
  });
  bake(scene, 'tree-trunk', 18, 62, 9, 61, (c) => {
    c.fillStyle = '#8b5a3c';
    roundRect(c, -7, -60, 14, 60, 6);
    c.fill();
  });
  bake(scene, 'tree-top', 96, 86, 48, 124, (c) => {
    for (const [dx, dy, r, color] of [
      [-18, -70, 26, '#7ccf63'],
      [18, -74, 26, '#8fd870'],
      [0, -92, 28, '#9be07a'],
    ] as const) {
      circle(c, dx, dy, r);
      fillStroke(c, color, '#4d9a3f', 3);
    }
  });
  bake(scene, 'bg-ground', W, H - GROUND_TOP, 0, -GROUND_TOP, (c) => {
    c.fillStyle = '#c58a5a';
    c.fillRect(0, GROUND, W, H - GROUND);
    c.fillStyle = '#a86f43';
    for (let i = 0; i < 12; i++) {
      ellipse(c, 40 + i * 84, GROUND + 40 + (i % 3) * 10, 10, 5);
      c.fill();
    }
    c.beginPath();
    c.moveTo(0, GROUND + 16);
    for (let x = 0; x <= W; x += 16) c.lineTo(x, GROUND - 6 + Math.sin(x * 0.3) * 4);
    c.lineTo(W, GROUND + 16);
    c.closePath();
    fillStroke(c, '#6fc95a', '#4d9a3f', 3);
    for (const f of FLOWERS) {
      c.strokeStyle = '#4d9a3f';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(f.x, GROUND - 2);
      c.lineTo(f.x, GROUND - f.h);
      c.stroke();
      circle(c, f.x, GROUND - f.h - 3, 4.5);
      fillStroke(c, f.c, null);
      circle(c, f.x, GROUND - f.h - 3, 1.8);
      fillStroke(c, '#fff7d6', null);
    }
  });
  platforms.forEach((p, i) =>
    // local (0, 0) is the middle of the leaf
    bake(scene, `platform-${i}`, p.w + 20, p.h + 20, p.w / 2 + 10, p.h / 2 + 10, (c) => {
      ellipse(c, 0, 0, p.w / 2 + 6, p.h / 2 + 6);
      fillStroke(c, '#7ccf63', '#4d9a3f', 3.5);
      c.strokeStyle = '#4d9a3f';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(-p.w / 2 + 6, 0);
      c.lineTo(p.w / 2 - 6, 0);
      c.stroke();
      for (let i = 1; i < 5; i++) {
        const x = -p.w / 2 + (p.w * i) / 5;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 12, -8);
        c.moveTo(x, 0);
        c.lineTo(x + 12, 8);
        c.stroke();
      }
    }),
  );
}

// Depths: `back` is behind everything, `ground` is under the boss, `platforms` is in front of the boss.
export class WorldView {
  private sunFace: GameObjects.Image;
  private clouds: GameObjects.Image[];
  private treeTops: GameObjects.Image[];
  private leaves: GameObjects.Image[];
  private t = 0;

  constructor(scene: Scene, depth: { back: number; ground: number; platforms: number }) {
    const back = scene.add.container(0, 0).setDepth(depth.back);
    this.sunFace = part(scene, faceKey('sun', 'happy'), 130, 92);
    this.clouds = CLOUDS.map((c) => part(scene, 'cloud', 0, c.y).setScale(INV * c.s));
    back.add([part(scene, 'bg-sky'), this.sunFace, ...this.clouds, part(scene, 'bg-hills')]);
    this.treeTops = TREES.map(([x, s]) => {
      back.add(part(scene, 'tree-trunk', x, GROUND - 10).setScale(INV * s));
      return part(scene, 'tree-top', x, GROUND - 10).setScale(INV * s);
    });
    back.add(this.treeTops);
    part(scene, 'bg-ground').setDepth(depth.ground);
    this.leaves = platforms.map((_, i) => part(scene, `platform-${i}`).setDepth(depth.platforms));
  }

  sync(dt: number) {
    const t = (this.t += dt);
    show(this.sunFace, faceKey('sun', 'happy', Math.sin(t * 0.8) > 0.97));
    CLOUDS.forEach((c, i) => this.clouds[i].setX(((c.x + t * c.v) % (W + 260)) - 130));
    TREES.forEach(([x, s], i) => this.treeTops[i].setX(x + Math.sin(t * 1.2 + x) * 3 * s));
    platforms.forEach((p, i) =>
      this.leaves[i].setPosition(p.x + p.w / 2, p.y + p.h / 2 + Math.sin(t * 1.5 + p.x) * 2),
    );
  }
}
