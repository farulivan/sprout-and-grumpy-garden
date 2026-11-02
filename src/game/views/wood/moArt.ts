// Mo's parts and his attacks', as placeholders: simple shapes in bold outlines, so that the fight can be played and
// its feel judged before its art is drawn. They are baked with the rest of the wood.
import type { Scene } from 'phaser';
import { bake, SOFT } from '../../art/bake';
import { circle, ellipse, glow, inside, line, linear, radial, seeded, type Ctx } from '../../art/draw';
import { bakeFaces } from '../faces';

const PEN = '#1c1238';
// His cap in each mood: sulky, cross, furious, and cheered up.
const CAPS: readonly (readonly [string, string, string])[] = [
  ['#c6d8ff', '#6a8cff', '#3a44b8'],
  ['#ffd0a8', '#ff7a3c', '#c0381c'],
  ['#e8c0ff', '#a85cf0', '#5a24a8'],
  ['#fff6c4', '#ffc84a', '#e0822a'],
];
export const MO_MOODS = CAPS.length;

function drawCap(c: Ctx, cap: readonly [string, string, string]) {
  const rx = 84,
    dome = () => {
      c.beginPath();
      c.moveTo(-rx, 14);
      c.bezierCurveTo(-rx, -52, rx, -52, rx, 14);
      c.quadraticCurveTo(rx * 0.6, 34, 0, 34);
      c.quadraticCurveTo(-rx * 0.6, 34, -rx, 14);
      c.closePath();
    };
  dome();
  c.fillStyle = radial(c, 0, -6, rx * 1.1, [cap[0], cap[1], cap[2]], -26, -26);
  c.fill();
  inside(c, dome, () => {
    for (const [x, y, r] of [
      [-50, -6, 11],
      [-14, -24, 14],
      [30, -14, 12],
      [58, 8, 8],
      [-24, 12, 7],
    ] as const) {
      ellipse(c, x, y, r, r * 0.84);
      c.fillStyle = 'rgba(255,255,255,0.86)';
      c.fill();
    }
    glow(c, -30, -30, 40, '#ffffff', 0.5, 16);
  });
  dome();
  line(c, PEN, 3.4);
}

function drawStalk(c: Ctx) {
  const body = () => {
    c.beginPath();
    c.moveTo(-42, 0);
    c.quadraticCurveTo(-36, -50, -32, -100);
    c.lineTo(32, -100);
    c.quadraticCurveTo(36, -50, 42, 0);
    c.quadraticCurveTo(0, 8, -42, 0);
    c.closePath();
  };
  body();
  c.fillStyle = linear(c, -40, 0, 40, 0, ['#fff3da', '#e4cfae', '#b49c84']);
  c.fill();
  body();
  line(c, PEN, 3.2);
}

function drawWave(c: Ctx) {
  const rand = seeded(401);
  for (let i = 0; i < 9; i++) {
    const x = -20 + i * 5 + rand() * 3,
      r = 7 + rand() * 7;
    circle(c, x, -r * 0.8, r);
    c.fillStyle = i % 2 ? '#cfc6e6' : '#efe6ff';
    c.fill();
    line(c, '#4a3a70', 1.6);
  }
}

function drawCloud(c: Ctx) {
  for (const [x, y, r] of [
    [-30, -4, 18],
    [-8, -14, 24],
    [18, -10, 21],
    [38, -2, 14],
  ] as const) {
    circle(c, x, y, r);
    c.fillStyle = radial(c, x, y, r, ['#8f8ab8', '#4e4a80'], x - r * 0.4, y - r * 0.5);
    c.fill();
    line(c, '#231f4c', 2.4);
  }
  ellipse(c, 2, 6, 44, 11);
  c.fillStyle = '#4e4a80';
  c.fill();
}

function drawRain(c: Ctx) {
  const rand = seeded(402);
  c.fillStyle = 'rgba(120,150,255,0.22)';
  c.fillRect(-29, 0, 58, 370);
  for (let i = 0; i < 70; i++) {
    const x = -27 + rand() * 54,
      y = rand() * 360;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 1, y + 13);
    line(c, '#cfe0ff', 2.2, 0.85);
  }
}

function drawBubble(c: Ctx) {
  circle(c, 0, 0, 15);
  c.fillStyle = radial(c, 0, 0, 16, ['#fff6d0', '#d8e88a', '#9ab84a'], -5, -5);
  c.fill();
  line(c, '#3c5a1c', 2.4);
  for (const [x, y] of [
    [-5, 3],
    [5, -3],
    [4, 6],
  ] as const) {
    circle(c, x, y, 2);
    c.fillStyle = '#6a8a2a';
    c.fill();
  }
  glow(c, -5, -6, 5, '#ffffff', 0.9);
}

export function bakeMo(scene: Scene) {
  CAPS.forEach((cap, i) => bake(scene, `mo-cap-${i}`, 190, 110, 95, 56, (c) => drawCap(c, cap)));
  bake(scene, 'mo-stalk', 100, 116, 50, 108, drawStalk);
  bakeFaces(scene, 'mo', 1.15, ['angry', 'surprised', 'worried', 'joy']);
  bake(scene, 'mo-wave', 70, 40, 35, 36, drawWave);
  bake(scene, 'gloom-cloud', 130, 70, 65, 40, drawCloud);
  bake(scene, 'gloom-rain', 62, 372, 31, 0, drawRain, SOFT);
  bake(scene, 'spore-bubble', 40, 40, 20, 20, drawBubble);
}
