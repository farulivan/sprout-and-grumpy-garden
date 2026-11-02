// The Mushroom Wood's enemies, as placeholders: simple shapes in bold outlines, so that they can be played and
// their feel judged before their art is drawn. They have their own atlas page (see bakeApart).
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake } from '../../art/bake';
import { EARTH_LINE } from '../../art/color';
import { circle, ellipse, line, radial, roundRect, type Ctx } from '../../art/draw';
import { drawFace } from '../../art/face';
import { bakeFaces } from '../faces';

const CAP_LINE = '#3a1440';

// A mushroom standing on (0, 0): a stalk and a round cap, in the colours given.
function drawMushroom(c: Ctx, w: number, h: number, cap: readonly [string, string], stalk = '#f3e6c8') {
  roundRect(c, -w * 0.28, -h * 0.55, w * 0.56, h * 0.55, 5);
  c.fillStyle = stalk;
  c.fill();
  line(c, EARTH_LINE, 2.4);
  c.beginPath();
  c.moveTo(-w / 2, -h * 0.5);
  c.bezierCurveTo(-w / 2, -h * 1.15, w / 2, -h * 1.15, w / 2, -h * 0.5);
  c.quadraticCurveTo(0, -h * 0.34, -w / 2, -h * 0.5);
  c.closePath();
  c.fillStyle = radial(c, -w * 0.15, -h * 0.85, w * 0.7, [cap[0], cap[1]]);
  c.fill();
  line(c, CAP_LINE, 2.8);
  for (const [dx, dy, r] of [
    [-w * 0.22, -h * 0.72, w * 0.08],
    [w * 0.18, -h * 0.78, w * 0.1],
  ] as const) {
    circle(c, dx, dy, r);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fill();
  }
}

function drawBurr(c: Ctx) {
  const n = 14;
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU,
      r = i % 2 ? 15 : 23;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = radial(c, -5, -6, 24, ['#c9a24d', '#8a5f24', '#5d3d14']);
  c.fill();
  line(c, '#2f1c06', 2.6);
  drawFace(c, 0, 1, 0.42, 'angry');
}

export function bakeWood(scene: Scene) {
  bake(scene, 'capling-body', 60, 56, 30, 52, (c) => drawMushroom(c, 52, 42, ['#a79ae0', '#5f4bb0']));
  bake(scene, 'capling-happy', 76, 64, 38, 58, (c) => {
    drawMushroom(c, 66, 44, ['#fff0a8', '#f2a93b']);
    drawFace(c, 0, -14, 0.46, 'joy');
  });
  bake(scene, 'burr-body', 56, 56, 28, 28, drawBurr);
  bake(scene, 'burr-star', 16, 16, 8, 8, (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2,
        r = i % 2 ? 2.8 : 6.5;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = '#ffe66d';
    c.fill();
    line(c, '#8a5f24', 1.2);
  });
  bake(scene, 'dropcap-body', 48, 44, 24, 22, (c) => {
    c.translate(0, 18);
    drawMushroom(c, 40, 36, ['#ff9a8a', '#c43b3b']);
  });
  bake(scene, 'dropcap-thread', 8, 300, 4, 300, (c) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -300);
    line(c, 'rgba(240,240,220,0.65)', 1.6);
  });
  bake(scene, 'toadlet-body', 56, 46, 28, 42, (c) => {
    drawMushroom(c, 46, 36, ['#9bf0a0', '#2f9d58'], '#ffe2b8');
  });
  // an orange ring on the ground, seen from the side
  bake(scene, 'toadlet-spot', 64, 18, 32, 9, (c) => {
    ellipse(c, 0, 0, 28, 6);
    line(c, '#ff8a1f', 3);
  });
  bakeFaces(scene, 'capling', 0.42, ['angry']);
  bakeFaces(scene, 'dropcap', 0.36, ['angry', 'surprised']);
  bakeFaces(scene, 'toadlet', 0.4, ['angry', 'surprised']);
}
