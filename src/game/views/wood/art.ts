// The Mushroom Wood's own parts, as placeholders: simple shapes in bold outlines, so that the stage can be
// played and its feel judged before its art is drawn. They have their own atlas page (see bakeApart).
import type { Scene } from 'phaser';
import { WOOD } from '../../../chapters';
import { GROUND, TAU } from '../../../config';
import { STAGES } from '../../../sim/stage/stages';
import { bake } from '../../art/bake';
import { EARTH_LINE } from '../../art/color';
import { circle, ellipse, line, linear, radial, roundRect, type Ctx } from '../../art/draw';
import { drawFace } from '../../art/face';
import { drawGate, drawSign } from '../stage/art';
import { drawLeafPlatform, drawStalk } from '../world/ground';
import { bakeFaces } from '../faces';

export const WOOD_BLOOMS = 2;
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

function drawTrunk(c: Ctx) {
  roundRect(c, 0, -200, 70, 204, 6);
  c.fillStyle = linear(c, 0, 0, 70, 0, ['#6b4a35', '#4a3122', '#33211a']);
  c.fill();
  line(c, '#1b100a', 3);
  for (const x of [14, 30, 49]) {
    c.beginPath();
    c.moveTo(x, -190);
    c.bezierCurveTo(x - 5, -130, x + 5, -70, x, -10);
    line(c, '#241610', 2, 0.6);
  }
  ellipse(c, 35, -198, 33, 8);
  c.fillStyle = '#8fae5f';
  c.fill();
  line(c, '#1b100a', 2.4);
}

// A wall of brambles rising from the ground, (0, 0) at the middle of its foot: thick stems with thorns on.
function drawBramble(c: Ctx) {
  for (const [lean, w, col] of [
    [-16, 11, '#3d5a2a'],
    [14, 12, '#2f4a22'],
    [-4, 14, '#4b6b30'],
  ] as const) {
    for (let y = 0; y > -440; y -= 60) {
      const x = Math.sin(y * 0.02 + lean) * 12 + lean;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(Math.sin((y - 62) * 0.02 + lean) * 12 + lean, y - 62);
      line(c, '#1d2c12', w + 4);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(Math.sin((y - 62) * 0.02 + lean) * 12 + lean, y - 62);
      line(c, col, w);
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(x + (side * w) / 2, y - 26);
        c.lineTo(x + side * (w / 2 + 10), y - 34);
        c.lineTo(x + (side * w) / 2, y - 38);
        c.closePath();
        c.fillStyle = '#e8dcc0';
        c.fill();
        line(c, '#1d2c12', 1.6);
      }
    }
  }
}

function drawGlowBloom(c: Ctx, kind: number) {
  const cap = kind ? (['#bff7ff', '#47b8d8'] as const) : (['#fff0b0', '#e8b23f'] as const);
  drawMushroom(c, kind ? 26 : 32, kind ? 30 : 36, cap);
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

  bake(scene, 'wood-trunk', 80, 216, 5, 208, drawTrunk);
  bake(scene, 'wood-bramble', 90, 450, 45, 445, drawBramble);
  bake(scene, 'wood-sign', 130, 100, 64, 96, (c) => drawSign(c, WOOD.sign));
  bake(scene, 'wood-gate', 190, 210, 95, 204, (c) => drawGate(c, WOOD.gate));
  for (let i = 0; i < WOOD_BLOOMS; i++)
    bake(scene, `wood-bloom-${i}`, 44, 44, 22, 40, (c) => drawGlowBloom(c, i));
  const widths = new Set<number>(),
    drops = new Set<number>();
  for (const p of STAGES[WOOD.stage].platforms) {
    widths.add(p.w);
    drops.add(GROUND - p.y - 8);
  }
  for (const w of widths)
    bake(scene, `wood-pad-${w}`, w + 44, 48, w / 2 + 20, 15, (c) => drawLeafPlatform(c, w));
  for (const drop of drops)
    bake(scene, `wood-stalk-${drop}`, 76, drop + 8, 38, 2, (c) => drawStalk(c, drop, drop % 2 ? 12 : -10));
}
