// Mo's attacks, as placeholders until their art is drawn. They are baked with the rest of the wood.
import type { Scene } from 'phaser';
import { bake, SOFT } from '../../art/bake';
import { circle, ellipse, glow, line, radial, seeded, type Ctx } from '../../art/draw';

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

export function bakeMoAttacks(scene: Scene) {
  bake(scene, 'gloom-cloud', 130, 70, 65, 40, drawCloud);
  bake(scene, 'gloom-rain', 62, 372, 31, 0, drawRain, SOFT);
  bake(scene, 'spore-bubble', 40, 40, 20, 20, drawBubble);
}
