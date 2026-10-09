// Sunny's face. He is the star of the fight, so unlike the little shared face his is built in layers:
// the whites of the eyes, two pupils that follow Pip around, and on top the lids, brows and mouth.
// Everything is drawn around (0, 0), the middle of his head.
import type { Scene } from 'phaser';
import { bake } from '../../art/bake';
import { circle, ellipse, inside, line, linear, radial, type Ctx } from '../../art/draw';
import { INK } from '../../art/face';

// grumpy1-3 = his resting face in each phase; puff = breathing in before an attack; shout = attacking.
export type SunnyFace = 'sleep' | 'grumpy1' | 'grumpy2' | 'grumpy3' | 'puff' | 'shout' | 'ouch' | 'happy';
export const SUNNY_FACES: readonly SunnyFace[] = [
  'sleep',
  'grumpy1',
  'grumpy2',
  'grumpy3',
  'puff',
  'shout',
  'ouch',
  'happy',
];
export const EYE = { x: 21, y: -8 }; // the right eye; the left one mirrors it
const OPEN_EYES: readonly SunnyFace[] = ['grumpy1', 'grumpy2', 'grumpy3', 'puff', 'shout', 'happy'];
const LID = '#a86e36',
  BROW = '#38200f';

export const sunnyFaceKey = (face: SunnyFace, blink = false) => `sunny-face-${face}${blink ? '-blink' : ''}`;
// Only faces with open eyes can blink or show pupils.
export const eyesOpen = (face: SunnyFace) => OPEN_EYES.includes(face);
const eyeSize = (face: SunnyFace) => (face === 'puff' ? 1.14 : face === 'happy' ? 1.06 : 1);
export const eyesKey = (face: SunnyFace) => `sunny-eyes-${eyeSize(face)}`;
// How angry the brows and lids are, 0-3.
const anger = (face: SunnyFace) =>
  face === 'grumpy1' ? 1 : face === 'grumpy2' ? 2 : face === 'grumpy3' ? 3 : face === 'shout' ? 2.4 : 0;

const white = (c: Ctx, d: number, k: number) => ellipse(c, d * EYE.x, EYE.y, 13 * k, 15 * k);

function drawWhites(c: Ctx, k: number) {
  for (const d of [-1, 1]) {
    white(c, d, k);
    c.fillStyle = '#fff';
    c.fill();
    inside(
      c,
      () => white(c, d, k),
      () => {
        c.fillStyle = linear(c, 0, EYE.y - 16, 0, EYE.y + 4, [
          'rgba(110,128,186,0.5)',
          'rgba(110,128,186,0)',
        ]);
        c.fillRect(d * EYE.x - 18, EYE.y - 20, 36, 40);
      },
    );
  }
}

function drawMouth(c: Ctx, face: SunnyFace) {
  const open = (top: number, bottom: number, half: number, teeth: boolean) => {
    const shape = () => {
      c.beginPath();
      c.moveTo(-half, top + 2);
      c.quadraticCurveTo(0, top - 3, half, top + 2);
      c.quadraticCurveTo(half * 0.9, bottom + 3, 0, bottom);
      c.quadraticCurveTo(-half * 0.9, bottom + 3, -half, top + 2);
      c.closePath();
    };
    shape();
    c.fillStyle = '#6e1f2a';
    c.fill();
    inside(c, shape, () => {
      ellipse(c, 0, bottom + 1, half * 0.62, (bottom - top) * 0.42);
      c.fillStyle = '#ff8fa3';
      c.fill();
      if (teeth) {
        c.fillStyle = '#fff';
        c.fillRect(-half, top - 4, half * 2, 9);
      }
    });
    shape();
    line(c, INK, 3.6);
  };
  if (face === 'grumpy1') {
    c.beginPath();
    c.arc(0, 44, 17, Math.PI * 1.24, Math.PI * 1.76);
    line(c, INK, 4.2);
  } else if (face === 'grumpy2') {
    c.beginPath();
    c.arc(0, 49, 22, Math.PI * 1.23, Math.PI * 1.77);
    line(c, INK, 4.6);
    for (const d of [-1, 1]) {
      c.beginPath();
      c.moveTo(d * 17, 35);
      c.lineTo(d * 20, 39);
      line(c, INK, 3.4);
    }
  } else if (face === 'grumpy3') {
    // gritted teeth
    const shape = () => {
      c.beginPath();
      c.moveTo(-19, 33);
      c.quadraticCurveTo(0, 18, 19, 33);
      c.lineTo(17, 42);
      c.quadraticCurveTo(0, 29, -17, 42);
      c.closePath();
    };
    shape();
    c.fillStyle = '#fff';
    c.fill();
    inside(c, shape, () => {
      for (let x = -12; x <= 12; x += 8) {
        c.beginPath();
        c.moveTo(x, 16);
        c.lineTo(x, 44);
        line(c, INK, 2);
      }
    });
    shape();
    line(c, INK, 3.6);
  } else if (face === 'puff') {
    ellipse(c, 0, 29, 8.5, 10.5);
    c.fillStyle = '#6e1f2a';
    c.fill();
    line(c, INK, 3.6);
  } else if (face === 'shout') {
    // a bellow: narrow at the top, wide at the bottom, corners turned down
    const shape = () => {
      c.beginPath();
      c.moveTo(-12, 27);
      c.quadraticCurveTo(0, 18, 12, 27);
      c.quadraticCurveTo(23, 36, 19, 45);
      c.quadraticCurveTo(0, 50, -19, 45);
      c.quadraticCurveTo(-23, 36, -12, 27);
      c.closePath();
    };
    shape();
    c.fillStyle = '#6e1f2a';
    c.fill();
    inside(c, shape, () => {
      ellipse(c, 0, 49, 12, 8);
      c.fillStyle = '#ff8fa3';
      c.fill();
      c.fillStyle = '#fff';
      c.fillRect(-14, 16, 28, 11.5);
    });
    shape();
    line(c, INK, 3.6);
  } else if (face === 'ouch') {
    c.beginPath();
    c.moveTo(-15, 31);
    c.quadraticCurveTo(-10, 23, -5, 31);
    c.quadraticCurveTo(0, 39, 5, 31);
    c.quadraticCurveTo(10, 23, 15, 31);
    line(c, INK, 4);
  } else if (face === 'sleep') {
    ellipse(c, 2, 29, 4.2, 5.2);
    c.fillStyle = INK;
    c.fill();
  } else {
    open(17, 43, 21, true);
  }
}

// Everything that sits over the eyes: lids, outlines, brows, blush and the mouth.
function drawFeatures(c: Ctx, face: SunnyFace, blink: boolean) {
  const a = anger(face),
    k = eyeSize(face),
    open = eyesOpen(face) && !blink;
  for (const d of [-1, 1]) {
    ellipse(c, d * 35, 14, 10.5, 6.5);
    c.fillStyle = a >= 3 ? 'rgba(255,70,80,0.5)' : 'rgba(255,112,122,0.42)';
    c.fill();
  }
  for (const d of [-1, 1]) {
    const ex = d * EYE.x,
      ey = EYE.y;
    if (open) {
      if (a) {
        // a heavy lid that slopes down toward the nose
        const outer = 2.5 + a,
          inner = 8 + a * 2.6;
        inside(
          c,
          () => white(c, d, k),
          () => {
            c.beginPath();
            c.moveTo(ex + d * 18, ey - 24);
            c.lineTo(ex + d * 18, ey - 16 + outer);
            c.lineTo(ex - d * 18, ey - 16 + inner);
            c.lineTo(ex - d * 18, ey - 24);
            c.closePath();
            c.fillStyle = LID;
            c.fill();
            c.beginPath();
            c.moveTo(ex + d * 18, ey - 16 + outer);
            c.lineTo(ex - d * 18, ey - 16 + inner);
            line(c, INK, 3.4);
          },
        );
      }
      white(c, d, k);
      line(c, INK, 2.8);
    } else if (face === 'ouch') {
      c.beginPath();
      c.moveTo(ex + d * 10, ey - 9);
      c.lineTo(ex - d * 7, ey);
      c.lineTo(ex + d * 10, ey + 9);
      line(c, INK, 4.6);
    } else if (face === 'happy') {
      c.beginPath();
      c.arc(ex, ey + 7, 12, Math.PI * 1.15, Math.PI * 1.85);
      line(c, INK, 4.2);
    } else {
      // closed, asleep or mid-blink
      c.beginPath();
      c.arc(ex, ey - 6, 12, Math.PI * 0.16, Math.PI * 0.84);
      line(c, INK, 3.8);
      if (face === 'sleep')
        for (const [dx, dy] of [
          [11, 3],
          [15, 0],
        ]) {
          c.beginPath();
          c.moveTo(ex + d * dx, ey + dy);
          c.lineTo(ex + d * (dx + 4), ey + dy + 3);
          line(c, INK, 2.4);
        }
    }
    // brows
    c.beginPath();
    if (a) {
      c.moveTo(ex + d * 17, ey - 23 - a);
      c.lineTo(ex - d * 10, ey - 12 + a * 1.6);
      line(c, BROW, 6.6);
    } else if (face === 'puff') {
      c.arc(ex, ey - 4, 24, Math.PI * (1.5 - d * 0.02 - 0.2), Math.PI * (1.5 - d * 0.02 + 0.2));
      line(c, BROW, 4.6);
    } else if (face === 'ouch') {
      c.moveTo(ex + d * 15, ey - 16);
      c.lineTo(ex - d * 9, ey - 22);
      line(c, BROW, 4.6);
    } else if (face === 'happy') {
      c.arc(ex, ey + 1, 24, Math.PI * 1.34, Math.PI * 1.66);
      line(c, BROW, 3.8);
    }
  }
  drawMouth(c, face);
}

export function bakeSunnyFaces(scene: Scene) {
  for (const k of new Set(SUNNY_FACES.map(eyeSize)))
    bake(scene, `sunny-eyes-${k}`, 124, 104, 62, 52, (c) => drawWhites(c, k));
  for (const face of SUNNY_FACES)
    for (const blink of eyesOpen(face) ? [false, true] : [false])
      bake(scene, sunnyFaceKey(face, blink), 124, 104, 62, 52, (c) => drawFeatures(c, face, blink));
  bake(scene, 'sunny-pupil', 22, 22, 11, 11, (c) => {
    circle(c, 0, 0, 7.8);
    c.fillStyle = radial(c, 0, 1, 8, ['#6b3d1c', '#3a2010', INK], 0, 3);
    c.fill();
    c.fillStyle = '#fff';
    circle(c, -2.4, -3, 2.9);
    c.fill();
    circle(c, 2.8, 2.8, 1.3);
    c.fill();
  });
}
