// The parts of the heads-up display: glossy hearts, the wooden frame of the boss's bar with Sunny's
// portrait on the end, and the soft shapes that sit behind text so it reads against any sky.
import type { Scene } from 'phaser';
import { H, TAU, W } from '../../config';
import { bake, SOFT } from '../art/bake';
import { circle, glow, heart, inside, leaf, line, linear, radial, roundRect } from '../art/draw';
import { drawFace } from '../art/face';

export const BAR_W = 380,
  BAR_H = 22;

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
    SOFT,
  );
  // red creeping in from the corners of the screen when Pip is on the last heart
  bake(
    scene,
    'hud-danger',
    W / 2,
    H / 2,
    0,
    0,
    (c) => {
      c.translate(W / 4, H / 4);
      c.scale(1, H / W);
      c.fillStyle = radial(c, 0, 0, W * 0.3, [
        [0, 'rgba(255,40,80,0)'],
        [0.6, 'rgba(255,40,80,0)'],
        [1, 'rgba(255,40,80,0.9)'],
      ]);
      c.fillRect(-W, -W, W * 2, W * 2);
    },
    0.5,
  );
}
