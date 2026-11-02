// Mo's face. He is a boss, so like Sunny's his is built in layers: the whites of his eyes, two pupils that watch
// Pip from under the brim, and on top the lids, brows, mouth and blush. Everything is drawn around (0, 0), the
// middle of his face. The brows do most of the work.
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake } from '../../art/bake';
import { circle, ellipse, glow, inside, line, type Ctx } from '../../art/draw';

const INK = '#1c1238';
const LID = '#f3dfbe'; // his stalk's own colour

export type MoFace = 'sulk' | 'shout' | 'cross' | 'furious' | 'ouch' | 'dizzy' | 'joy' | 'sleepy';
const MO_FACES: readonly MoFace[] = ['sulk', 'shout', 'cross', 'furious', 'ouch', 'dizzy', 'joy', 'sleepy'];

interface OpenEyes {
  lid: number; // how far the lid comes down, 0-1
  lidIn?: number; // how much lower toward his nose: the crosser, the more
  browIn: number;
  browOut: number;
  browY: number;
  pupil: number;
  blush: number;
  mouth: 'pout' | 'shout' | 'grit' | 'roar';
}
const OPEN: Partial<Record<MoFace, OpenEyes>> = {
  sulk: { lid: 0.48, lidIn: -2, browIn: -3, browOut: 3, browY: -27, pupil: 0.92, blush: 0.6, mouth: 'pout' },
  shout: { lid: 0, browIn: 8, browOut: -11, browY: -31, pupil: 0.62, blush: 0.35, mouth: 'shout' },
  cross: {
    lid: 0.34,
    lidIn: 5,
    browIn: 12,
    browOut: -9,
    browY: -27,
    pupil: 0.74,
    blush: 0.75,
    mouth: 'grit',
  },
  furious: {
    lid: 0.22,
    lidIn: 7,
    browIn: 16,
    browOut: -11,
    browY: -27,
    pupil: 0.5,
    blush: 0.9,
    mouth: 'roar',
  },
};
export const moFaceKey = (face: MoFace, blink = false) => `mo-face-${face}${blink ? '-blink' : ''}`;
// Only some faces have eyes with pupils to show. The rest have their eyes drawn in.
export const eyesOpen = (face: MoFace) => OPEN[face] !== undefined;
export const pupilSize = (face: MoFace) => OPEN[face]?.pupil ?? 1;
export const FURIOUS_EYE = 0xfff3a8; // the whites of his eyes, tinted, when he is furious
export const EYE_X = 22,
  EYE_Y = -5,
  LOOK = 5, // how far his pupils move across
  PUPIL_DOWN = 3;
const EYE_RX = 14,
  EYE_RY = 18;

const eyeShape = (c: Ctx, side: number) => ellipse(c, side * EYE_X, EYE_Y, EYE_RX, EYE_RY);

export function drawWhites(c: Ctx, color = '#ffffff') {
  for (const side of [-1, 1]) {
    eyeShape(c, side);
    c.fillStyle = color;
    c.fill();
  }
}

// One pupil, at full size. (0, 0) is its middle.
export function drawPupil(c: Ctx) {
  ellipse(c, 0, 0, 10, 12.5);
  c.fillStyle = '#2d1a4a';
  c.fill();
  ellipse(c, 0, 0, 6, 7.5);
  c.fillStyle = INK;
  c.fill();
  circle(c, -3, -5, 3);
  c.fillStyle = '#fff';
  c.fill();
  circle(c, 3, 4, 1.4);
  c.fillStyle = '#fff';
  c.fill();
}

function drawBlush(c: Ctx, alpha: number) {
  if (alpha <= 0) return;
  for (const side of [-1, 1]) glow(c, side * 35, 16, 13, '#ff7a9a', alpha, 8);
}

// A lid with a curved edge, and the eye's outline over it.
function drawLid(c: Ctx, side: number, f: OpenEyes) {
  if (f.lid > 0)
    inside(
      c,
      () => eyeShape(c, side),
      () => {
        const x = side * EYE_X,
          edge = EYE_Y - EYE_RY + EYE_RY * 2 * f.lid,
          inner = edge + (f.lidIn ?? 0),
          outer = edge - (f.lidIn ?? 0) * 0.4,
          lidEdge = () => {
            c.beginPath();
            c.moveTo(x + side * (EYE_RX + 2), outer);
            c.quadraticCurveTo(x, edge + 3, x - side * (EYE_RX + 2), inner);
          };
        lidEdge();
        c.lineTo(x - side * (EYE_RX + 2), EYE_Y - EYE_RY - 3);
        c.lineTo(x + side * (EYE_RX + 2), EYE_Y - EYE_RY - 3);
        c.closePath();
        c.fillStyle = LID;
        c.fill();
        lidEdge();
        line(c, INK, 3.4);
      },
    );
  eyeShape(c, side);
  line(c, INK, 2.3);
}

// The brow, thick and low: this is most of his mood.
function drawBrow(c: Ctx, side: number, f: OpenEyes) {
  c.beginPath();
  c.moveTo(side * 38, f.browY + f.browOut + 2);
  c.quadraticCurveTo(side * 23, f.browY - 2 + (f.browIn + f.browOut) / 2, side * 9, f.browY + f.browIn);
  line(c, INK, 5.8);
}

function drawMouth(c: Ctx, kind: OpenEyes['mouth']) {
  if (kind === 'pout') {
    c.beginPath();
    c.moveTo(-17, 27);
    c.quadraticCurveTo(0, 15, 17, 27);
    line(c, INK, 3.6);
    ellipse(c, 0, 26, 8, 3.6);
    c.fillStyle = '#d97a8c';
    c.fill();
    line(c, INK, 2);
  } else if (kind === 'shout') {
    const shape = () => {
      c.beginPath();
      c.moveTo(-22, 16);
      c.quadraticCurveTo(0, 10, 22, 16);
      c.bezierCurveTo(26, 34, 14, 46, 0, 46);
      c.bezierCurveTo(-14, 46, -26, 34, -22, 16);
      c.closePath();
    };
    shape();
    c.fillStyle = '#4a1230';
    c.fill();
    inside(c, shape, () => {
      ellipse(c, 0, 44, 15, 10);
      c.fillStyle = '#ff7f96';
      c.fill();
      c.fillStyle = '#fff';
      c.fillRect(-22, 10, 44, 8);
    });
    shape();
    line(c, INK, 3);
  } else if (kind === 'grit') {
    const shape = () => {
      c.beginPath();
      c.moveTo(-23, 19);
      c.quadraticCurveTo(0, 13, 23, 19);
      c.quadraticCurveTo(25, 34, 15, 36);
      c.quadraticCurveTo(0, 32, -15, 36);
      c.quadraticCurveTo(-25, 34, -23, 19);
      c.closePath();
    };
    shape();
    c.fillStyle = '#fff';
    c.fill();
    inside(c, shape, () => {
      c.beginPath();
      c.moveTo(-26, 26);
      c.quadraticCurveTo(0, 21, 26, 26);
      line(c, INK, 2);
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(i * 8.6, 12);
        c.lineTo(i * 8.6, 38);
        line(c, INK, 2);
      }
    });
    shape();
    line(c, INK, 3);
  } else {
    const shape = () => {
      c.beginPath();
      c.moveTo(-26, 15);
      c.quadraticCurveTo(0, 8, 26, 15);
      c.bezierCurveTo(30, 36, 16, 50, 0, 50);
      c.bezierCurveTo(-16, 50, -30, 36, -26, 15);
      c.closePath();
    };
    shape();
    c.fillStyle = '#3e0c2a';
    c.fill();
    inside(c, shape, () => {
      ellipse(c, 0, 49, 17, 11);
      c.fillStyle = '#ff6f8e';
      c.fill();
      c.fillStyle = '#fff';
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(i * 7.6 - 3.8, 8);
        c.lineTo(i * 7.6 + 3.8, 8);
        c.lineTo(i * 7.6, 21);
        c.closePath();
        c.fill();
      }
    });
    shape();
    line(c, INK, 3);
  }
}

function drawClosedEye(c: Ctx, side: number, width: number) {
  c.beginPath();
  c.arc(side * 21, -8, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  line(c, INK, width);
}

// Everything but the whites and the pupils: this goes over them. blink closes eyes that were open.
function drawFaceOver(c: Ctx, mood: MoFace, blink: boolean) {
  const open = OPEN[mood];
  if (open) {
    drawBlush(c, open.blush);
    for (const side of [-1, 1]) {
      if (blink) drawClosedEye(c, side, 4.6);
      else drawLid(c, side, open);
      drawBrow(c, side, open);
    }
    drawMouth(c, open.mouth);
  } else if (mood === 'ouch') {
    drawBlush(c, 0.6);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(side * 34, -16);
      c.lineTo(side * 12, -5);
      c.lineTo(side * 34, 6);
      line(c, INK, 5.4);
    }
    ellipse(c, 0, 28, 9, 11);
    c.fillStyle = '#4a1230';
    c.fill();
    line(c, INK, 3);
  } else if (mood === 'dizzy') {
    for (const side of [-1, 1]) {
      const x = side * 21,
        y = -5;
      ellipse(c, x, y, 17, 20);
      c.fillStyle = '#fff';
      c.fill();
      line(c, INK, 2.8);
      c.beginPath();
      for (let a = 0; a < TAU * 2.4; a += 0.25) {
        const r = 1 + a * 0.95,
          px = x + Math.cos(a * side + 1) * r,
          py = y + Math.sin(a * side + 1) * r * 1.12;
        if (a === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      line(c, INK, 2.4);
    }
    c.beginPath();
    c.moveTo(-20, 28);
    c.bezierCurveTo(-10, 18, -2, 36, 8, 26);
    c.bezierCurveTo(14, 21, 18, 24, 21, 28);
    line(c, INK, 3.4);
    ellipse(c, 10, 34, 8, 10, 0.2);
    c.fillStyle = '#ff7f96';
    c.fill();
    line(c, INK, 2.4);
  } else if (mood === 'joy') {
    drawBlush(c, 0.95);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(side * 21, 0, 15, 1.13 * Math.PI, 1.87 * Math.PI);
      line(c, INK, 5.2);
    }
    const shape = () => {
      c.beginPath();
      c.moveTo(-26, 12);
      c.quadraticCurveTo(0, 18, 26, 12);
      c.bezierCurveTo(26, 34, 12, 44, 0, 44);
      c.bezierCurveTo(-12, 44, -26, 34, -26, 12);
      c.closePath();
    };
    shape();
    c.fillStyle = '#5a1630';
    c.fill();
    inside(c, shape, () => {
      ellipse(c, 0, 42, 17, 13);
      c.fillStyle = '#ff8fa6';
      c.fill();
      c.fillStyle = '#fff';
      c.fillRect(-26, 8, 52, 9);
    });
    shape();
    line(c, INK, 3);
  } else {
    drawBlush(c, 0.4);
    for (const side of [-1, 1]) drawClosedEye(c, side, 4.6);
    ellipse(c, 2, 28, 6, 7);
    c.fillStyle = '#4a1230';
    c.fill();
    line(c, INK, 2.6);
  }
}

// The whole face in one drawing, for his portrait. look: -1..1, which way his pupils go.
export function drawWholeFace(c: Ctx, mood: MoFace, look = 0) {
  const open = OPEN[mood];
  if (open) {
    drawWhites(c, mood === 'furious' ? '#fff3a8' : '#ffffff');
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * EYE_X + look * LOOK, EYE_Y + PUPIL_DOWN);
      c.scale(open.pupil, open.pupil);
      drawPupil(c);
      c.restore();
    }
  }
  drawFaceOver(c, mood, false);
}

export function bakeMoFaces(scene: Scene) {
  bake(scene, 'mo-eye', 84, 44, 42, 27, (c) => drawWhites(c));
  bake(scene, 'mo-pupil', 24, 30, 12, 15, drawPupil);
  for (const mood of MO_FACES) {
    bake(scene, moFaceKey(mood), 104, 110, 52, 44, (c) => drawFaceOver(c, mood, false));
    if (eyesOpen(mood))
      bake(scene, moFaceKey(mood, true), 104, 110, 52, 44, (c) => drawFaceOver(c, mood, true));
  }
}
