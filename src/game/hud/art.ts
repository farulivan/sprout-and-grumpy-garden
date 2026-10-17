// The parts of the heads-up display: glossy hearts, the wooden frame of the boss's bar with Sunny's
// portrait on the end, and the soft shapes that sit behind text so it reads against any sky.
import type { Scene } from 'phaser';
import { TAU } from '../../config';
import { bake, HAZY, SOFT } from '../art/bake';
import { circle, glow, heart, inside, leaf, line, linear, radial, roundRect } from '../art/draw';
import { drawFace } from '../art/face';

export const BAR_W = 380,
  BAR_H = 22;
// The coloured bar inside the track.
export const FILL_W = BAR_W - 5,
  FILL_H = BAR_H - 5;

export function bakeHud(scene: Scene) {
  const heartShape = (c: CanvasRenderingContext2D) => heart(c, 0, 0, 12.5);
  bake(scene, 'heart-full', 44, 42, 22, 20, (c) => {
    glow(c, 0, 4, 18, '#3a0a1c', 0.42, 13);
    heartShape(c);
    c.fillStyle = linear(c, 0, -14, 0, 12, ['#ffa3bd', '#ff5f8a', '#e63a67']);
    c.fill();
    inside(
      c,
      () => heartShape(c),
      () => {
        glow(c, 7, 9, 13, '#9c1039', 0.5, 7);
        glow(c, -6, -7, 8.5, '#ffffff', 0.85, 5.5);
      },
    );
    heartShape(c);
    line(c, '#7a1436', 3);
  });
  bake(scene, 'heart-empty', 44, 42, 22, 20, (c) => {
    heartShape(c);
    c.fillStyle = 'rgba(40,22,50,0.42)';
    c.fill();
    line(c, 'rgba(255,255,255,0.72)', 2.4);
  });

  // The frame and the empty track. (0, 0) is the top left of the track.
  bake(scene, 'bar-back', BAR_W + 28, BAR_H + 30, 14, 12, (c) => {
    glow(c, BAR_W / 2, BAR_H / 2 + 6, BAR_W * 0.56, '#1a0d05', 0.4, 16);
    roundRect(c, -6, -6, BAR_W + 12, BAR_H + 12, 15);
    c.fillStyle = linear(c, 0, -6, 0, BAR_H + 6, ['#e2b074', '#b47a44', '#8f5b30']);
    c.fill();
    line(c, '#38200f', 3);
    roundRect(c, -3.6, -3.6, BAR_W + 7.2, BAR_H + 7.2, 12.6);
    line(c, '#fbe0b0', 1.4, 0.7);
    roundRect(c, 0, 0, BAR_W, BAR_H, BAR_H / 2);
    c.fillStyle = linear(c, 0, 0, 0, BAR_H, ['#1d110a', '#3b2516']);
    c.fill();
    line(c, '#1a0e06', 2);
  });
  // The round end of the coloured bar: the right half of a disc, with (0, 0) in the middle of its flat
  // side. The bar itself is the shared white square stretched between two of these.
  bake(scene, 'bar-cap', FILL_H / 2 + 1, FILL_H, 0, FILL_H / 2, (c) => {
    c.beginPath();
    c.arc(0, 0, FILL_H / 2, -Math.PI / 2, Math.PI / 2);
    c.closePath();
    c.fillStyle = '#fff';
    c.fill();
  });
  // What lies over the fill: a glassy shine, and notches where Sunny's phases change.
  bake(scene, 'bar-gloss', BAR_W + 28, BAR_H + 30, 14, 12, (c) => {
    inside(
      c,
      () => roundRect(c, 2, 2, BAR_W - 4, BAR_H - 4, BAR_H / 2),
      () => {
        c.fillStyle = linear(c, 0, 2, 0, BAR_H * 0.55, ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']);
        c.fillRect(0, 0, BAR_W, BAR_H * 0.55);
      },
    );
    for (const k of [0.33, 0.66]) {
      const x = 2.5 + (BAR_W - 5) * k;
      c.beginPath();
      c.moveTo(x, 1.5);
      c.lineTo(x, BAR_H - 1.5);
      line(c, '#1a0e06', 3, 0.7);
      c.beginPath();
      c.moveTo(x + 1.6, 3);
      c.lineTo(x + 1.6, BAR_H - 3);
      line(c, '#ffffff', 1, 0.45);
    }
  });
  // Sunny's portrait for the end of the bar: grumpy while the fight is on, beaming once he is cheered up
  for (const mood of ['angry', 'joy'] as const)
    bake(scene, `bar-icon-${mood}`, 64, 64, 32, 32, (c) => {
      glow(c, 0, 3, 30, '#1a0d05', 0.4);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        leaf(c, Math.cos(a) * 9, Math.sin(a) * 9, 18, 5.6, a, 0.5, 0.75);
        c.fillStyle = mood === 'joy' ? '#ffe15a' : '#ffc62e';
        c.fill();
        line(c, '#a65a0a', 1.8);
      }
      circle(c, 0, 0, 14);
      c.fillStyle = radial(c, 0, 0, 15, ['#cf9350', '#96602c'], -4, -5);
      c.fill();
      line(c, '#38200f', 2.6);
      drawFace(c, 0, 0.5, 0.52, mood);
    });

  // Pip's head, for the stage's path bar: how far along the path to Sunny he is
  bake(scene, 'hud-pip', 44, 48, 22, 28, (c) => {
    glow(c, 0, 4, 20, '#0d2a12', 0.4);
    for (const side of [-1, 1]) {
      leaf(c, side * 2, -14, 13, 5.5, -Math.PI / 2 + side * 0.75);
      c.fillStyle = side < 0 ? '#58b947' : '#aaec7a';
      c.fill();
      line(c, '#226a2e', 2);
    }
    circle(c, 0, 0, 15);
    c.fillStyle = radial(c, 0, 0, 16, ['#e6fd9e', '#b3ee6a', '#82d44c'], -5, -6);
    c.fill();
    line(c, '#226a2e', 2.6);
    drawFace(c, 0.5, 1.5, 0.5, 'happy');
  });
  // an empty place for a golden seed, beside the hearts on a stage
  bake(scene, 'seed-slot', 30, 40, 15, 20, (c) => {
    c.beginPath();
    c.moveTo(0, -15);
    c.bezierCurveTo(10, -9, 10, 7, 0, 14);
    c.bezierCurveTo(-10, 7, -10, -9, 0, -15);
    c.closePath();
    c.fillStyle = 'rgba(30,20,10,0.35)';
    c.fill();
    line(c, '#fff3c0', 2.2, 0.85);
  });

  // a soft dark patch behind a line of text
  bake(scene, 'toast-plate', 320, 60, 160, 30, (c) => glow(c, 0, 0, 158, '#06231a', 0.6, 26), SOFT);
  // rays bursting out behind "GO!"
  bake(
    scene,
    'go-burst',
    420,
    420,
    210,
    210,
    (c) => {
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU,
          len = i % 2 ? 150 : 205;
        c.fillStyle = radial(c, 0, 0, len, [
          [0, 'rgba(255,238,150,0.9)'],
          [0.5, 'rgba(255,220,110,0.5)'],
          [1, 'rgba(255,210,90,0)'],
        ]);
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, len, a - 0.075, a + 0.075);
        c.closePath();
        c.fill();
      }
    },
    HAZY,
  );
}
