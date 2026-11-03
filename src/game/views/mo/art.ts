// Mo's parts: a soft dome of a cap, a fat pale stalk that bends as a ribbon, stubby arms, and the whirl he turns into.
// One light, the moon, upper left. MoView.ts moves them. They are baked with the rest of the wood, the first time
// Chapter 2 is played.
import type { Scene } from 'phaser';
import { TAU } from '../../../config';
import { bake, SOFT } from '../../art/bake';
import { rgba } from '../../art/color';
import { blob, circle, ellipse, glow, inside, line, linear, radial, seeded, type Ctx } from '../../art/draw';

export const MO_PALETTE = {
  ink: '#1c1238', // the same as the wood's outlines
  stalk: { hi: '#fff6e2', lit: '#f3dfbe', mid: '#d9bb9b', low: '#a9849a', deep: '#6f5288' },
  // his cap in each mood: sulky, cross, furious, cheered up
  caps: [
    {
      hi: '#d8e6ff',
      lit: '#8fb0ff',
      mid: '#5476ee',
      low: '#2f3eae',
      rim: '#1d2272',
      spot: '#eef5ff',
      glow: '#9ec8ff',
    },
    {
      hi: '#ffe6c4',
      lit: '#ffa766',
      mid: '#f4652f',
      low: '#b52f1f',
      rim: '#651420',
      spot: '#fff2dc',
      glow: '#ffb070',
    },
    {
      hi: '#f8dcff',
      lit: '#cf95ff',
      mid: '#9c4ef2',
      low: '#5a22b0',
      rim: '#2b0d66',
      spot: '#ffd8ff',
      glow: '#ff84f0',
    },
    {
      hi: '#fffcdc',
      lit: '#ffe476',
      mid: '#ffc53f',
      low: '#e98a2b',
      rim: '#94451a',
      spot: '#fffaea',
      glow: '#fff0a0',
    },
  ],
  gills: ['#3a2150', '#6e4668', '#94687a'],
  // the acid of all his poison: the one thing in the fight this colour
  gas: { back: '#1c6a4a', mid: '#3f9a3c', body: '#8fd832', hot: '#e6fb86', rim: '#14502e' },
  // ...and the same, on what is alive: the ring's toadstools and the spore pods
  acid: { out: '#145a30', deep: '#2b9440', mid: '#6cc638', lit: '#b6e84c', hi: '#ecfca0' },
} as const;

const INK = MO_PALETTE.ink;
const STALK = MO_PALETTE.stalk;
export type CapColors = (typeof MO_PALETTE.caps)[number];
export const MO_CAPS = MO_PALETTE.caps.length;
export const WHIRL_FRAMES = 6;
export const STALK_LEN = 256; // the stalk's strip, along his height
export const STALK_THICK = 96; // ...and across it

// The cap's outline: a soft dome that slumps a little to one side, with a wavy, heavy brim. (0, 0) is the sim's capY.
export function capPath(c: Ctx) {
  c.beginPath();
  c.moveTo(-102, 14);
  c.bezierCurveTo(-104, -30, -58, -64, -8, -64);
  c.bezierCurveTo(50, -64, 102, -34, 104, 20);
  c.bezierCurveTo(104, 30, 92, 36, 78, 32);
  c.bezierCurveTo(62, 28, 50, 38, 32, 37);
  c.bezierCurveTo(14, 36, 6, 30, -10, 32);
  c.bezierCurveTo(-30, 34, -40, 40, -58, 35);
  c.bezierCurveTo(-74, 30, -84, 34, -94, 28);
  c.bezierCurveTo(-101, 24, -103, 20, -102, 14);
  c.closePath();
}
const CAP_SPOTS = [
  [-60, -14, 17, 14, -0.3],
  [-16, -42, 21, 14, -0.05],
  [34, -32, 16, 12, 0.25],
  [72, -4, 13, 11, 0.5],
  [-20, -2, 13, 10, 0],
  [20, 6, 10, 8, 0.1],
  [-84, 10, 8, 7, -0.5],
  [54, 20, 8, 5, 0.2],
  [-52, 22, 7, 4, -0.1],
] as const;

export function drawCap(c: Ctx, p: CapColors) {
  capPath(c);
  c.fillStyle = radial(c, -6, -8, 124, [p.hi, p.lit, p.mid, p.low], -40, -46);
  c.fill();
  inside(
    c,
    () => capPath(c),
    () => {
      // the brim turns under, away from the light
      c.fillStyle = linear(c, 0, -2, 0, 40, [rgba(p.low, 0), rgba(p.low, 0.75), p.rim]);
      c.fillRect(-110, -2, 220, 44);
      // shade down the side away from the moon
      c.fillStyle = radial(c, -30, -30, 150, [
        [0.62, rgba(p.rim, 0)],
        [1, rgba(p.rim, 0.6)],
      ]);
      c.fillRect(-110, -70, 220, 110);
      for (const [x, y, rx, ry, rot] of CAP_SPOTS) {
        ellipse(c, x + 1, y + 2, rx, ry, rot);
        c.fillStyle = rgba(p.rim, 0.45);
        c.fill();
        ellipse(c, x, y, rx, ry, rot);
        c.fillStyle = radial(
          c,
          x,
          y,
          Math.max(rx, ry),
          [p.spot, p.spot, rgba(p.spot, 0.72)],
          x - rx * 0.3,
          y - ry * 0.3,
        );
        c.fill();
      }
      // moonlight along the top left edge
      c.beginPath();
      c.moveTo(-98, 2);
      c.bezierCurveTo(-92, -32, -52, -58, -8, -60);
      line(c, '#ffffff', 3.2, 0.5);
    },
  );
  capPath(c);
  line(c, INK, 3.8);
}

// The same spots again, soft, to be drawn as light: they glow in the dark and pulse.
function drawCapGlow(c: Ctx, p: CapColors) {
  for (const [x, y, rx, ry] of CAP_SPOTS) glow(c, x, y, rx * 1.9, p.glow, 0.75, ry * 1.9);
}

// The underside, seen from a little below as he rears up.
export function drawGills(c: Ctx) {
  ellipse(c, 0, 22, 92, 25);
  c.fillStyle = linear(c, 0, 0, 0, 48, [...MO_PALETTE.gills]);
  c.fill();
  inside(
    c,
    () => ellipse(c, 0, 22, 92, 25),
    () => {
      for (let i = -13; i <= 13; i++) {
        const a = (i / 13) * 1.32;
        c.beginPath();
        c.moveTo(Math.sin(a) * 26, 26);
        c.lineTo(Math.sin(a) * 94, 22 + Math.cos(a) * 26);
        line(c, '#2c1840', 1.7, 0.6);
      }
    },
  );
  ellipse(c, 0, 22, 92, 25);
  line(c, INK, 3);
}

// Light from the left of him, across the whole of him: the foot and the strip share it so that they meet unseen.
const stalkShade = (c: Ctx, x0: number, y0: number, x1: number, y1: number) =>
  linear(c, x0, y0, x1, y1, [
    [0, STALK.lit],
    [0.28, STALK.hi],
    [0.62, STALK.lit],
    [0.86, STALK.mid],
    [1, STALK.low],
  ]);

// The foot: the bulb he stands on, with its root toes. It never stretches. (0, 0) is on the ground under his middle.
const FOOT_FADE = [-48, -64] as const; // it fades away between these heights, into the stalk behind it
function drawFoot(c: Ctx) {
  const bulb = () => {
    c.beginPath();
    c.moveTo(-60, -3);
    c.bezierCurveTo(-74, -24, -60, -44, -46, -66);
    c.lineTo(46, -66);
    c.bezierCurveTo(60, -44, 74, -24, 60, -3);
    c.bezierCurveTo(30, 8, -30, 8, -60, -3);
    c.closePath();
  };
  bulb();
  c.fillStyle = stalkShade(c, -62, 0, 66, 0);
  c.fill();
  inside(c, bulb, () => {
    const rand = seeded(77);
    for (let i = 0; i < 9; i++) {
      const x = -48 + rand() * 96,
        y0 = -6 - rand() * 18,
        len = 18 + rand() * 24;
      c.beginPath();
      c.moveTo(x, y0);
      c.quadraticCurveTo(x * 0.96, y0 - len / 2, x * 0.9, y0 - len);
      line(c, STALK.low, 1.2, 0.3);
    }
    // the dusk's cool bounce light, low down
    c.fillStyle = linear(c, 0, 8, 0, -30, [rgba(STALK.deep, 0.75), rgba(STALK.deep, 0)]);
    c.fillRect(-80, -30, 160, 40);
  });
  bulb();
  line(c, INK, 3.6);
  // Rub its top away so that it melts into the stalk: its line stops where the stalk's takes over.
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = linear(c, 0, FOOT_FADE[0], 0, FOOT_FADE[1], ['rgba(0,0,0,0)', 'rgba(0,0,0,1)']);
  c.fillRect(-80, -70, 160, 22);
  c.restore();
  // root toes
  for (const [x, w, a] of [
    [-58, 15, 0.4],
    [-30, 13, 0.1],
    [28, 13, -0.1],
    [56, 15, -0.4],
  ] as const) {
    ellipse(c, x, 1, w, 7, a);
    c.fillStyle = linear(c, 0, -6, 0, 8, [STALK.lit, STALK.low]);
    c.fill();
    line(c, INK, 2.6);
  }
}

// The stalk itself, as a strip that a Ribbon bends: it runs from his foot at x = 0 to under his cap at the far end,
// and across it y = -48 is his left, the side the moon is on.
function drawStalkStrip(c: Ctx) {
  const half0 = 46.5,
    half1 = 43,
    body = () => {
      c.beginPath();
      c.moveTo(0, -half0);
      c.lineTo(STALK_LEN, -half1);
      c.lineTo(STALK_LEN, half1);
      c.lineTo(0, half0);
      c.closePath();
    };
  body();
  c.fillStyle = stalkShade(c, 0, -62, 0, 66);
  c.fill();
  inside(c, body, () => {
    // fibres running up it
    const rand = seeded(78);
    for (let i = 0; i < 16; i++) {
      const y = -42 + rand() * 84,
        x0 = rand() * 170,
        len = 40 + rand() * 90;
      c.beginPath();
      c.moveTo(x0, y);
      c.quadraticCurveTo(x0 + len / 2, y * 0.96, x0 + len, y * 0.88);
      line(c, STALK.low, 1.2, 0.3);
    }
    // the cap's shadow
    c.fillStyle = linear(c, STALK_LEN, 0, STALK_LEN - 76, 0, [rgba(STALK.deep, 0.85), rgba(STALK.deep, 0)]);
    c.fillRect(STALK_LEN - 76, -48, 76, 96);
  });
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, side * half0);
    c.lineTo(STALK_LEN, side * half1);
    line(c, INK, 3.6);
  }
}

// The whole stalk as one shape, from his feet (0, 0) up to h: for far away and for his portrait.
export function stalkPath(c: Ctx, h: number) {
  const top = 43;
  c.beginPath();
  c.moveTo(-60, -3);
  c.bezierCurveTo(-74, -24, -58, -52, -50, -72);
  c.bezierCurveTo(-46, -h * 0.62, -top, -h * 0.82, -top, -h);
  c.lineTo(top, -h);
  c.bezierCurveTo(top, -h * 0.82, 46, -h * 0.62, 50, -72);
  c.bezierCurveTo(58, -52, 74, -24, 60, -3);
  c.bezierCurveTo(30, 8, -30, 8, -60, -3);
  c.closePath();
}

// The frilly collar a toadstool wears under its cap.
function drawSkirt(c: Ctx) {
  const path = () => {
    c.beginPath();
    c.moveTo(-36, -8);
    c.quadraticCurveTo(0, 2, 36, -8);
    c.bezierCurveTo(44, 2, 50, 10, 46, 16);
    c.bezierCurveTo(38, 12, 34, 22, 25, 18);
    c.bezierCurveTo(17, 14, 12, 25, 1, 20);
    c.bezierCurveTo(-8, 16, -14, 25, -24, 18);
    c.bezierCurveTo(-32, 13, -38, 21, -46, 15);
    c.bezierCurveTo(-50, 9, -43, 2, -36, -8);
    c.closePath();
  };
  path();
  c.fillStyle = linear(c, -46, 0, 46, 0, [STALK.lit, STALK.hi, STALK.lit, STALK.mid]);
  c.fill();
  inside(c, path, () => {
    for (let i = -5; i <= 5; i++) {
      c.beginPath();
      c.moveTo(i * 6, -4);
      c.lineTo(i * 8.4, 22);
      line(c, STALK.low, 1.2, 0.55);
    }
  });
  path();
  line(c, INK, 2.8);
}

// One stubby arm, from the shoulder (0, 0) along +x.
function drawArm(c: Ctx) {
  const path = () => {
    c.beginPath();
    c.moveTo(0, -8);
    c.bezierCurveTo(14, -10, 26, -13, 36, -13);
    c.bezierCurveTo(50, -13, 50, 13, 36, 13);
    c.bezierCurveTo(26, 13, 14, 10, 0, 8);
    c.closePath();
  };
  path();
  c.fillStyle = linear(c, 0, -13, 0, 13, [STALK.hi, STALK.lit, STALK.low]);
  c.fill();
  path();
  line(c, INK, 3);
}

// Spinning like a top: the cap's spots slide past, the stalk is a blur with his face going round on it. Flip through
// the frames. (0, 0) is on the ground under him.
function drawWhirl(c: Ctx, frame: number) {
  const p = MO_PALETTE.caps[2], // he only spins when furious
    turn = frame / WHIRL_FRAMES,
    wrap = (u: number) => ((u % 1) + 1) % 1,
    body = () => {
      c.beginPath();
      c.moveTo(-40, -66);
      c.bezierCurveTo(-58, -40, -64, -12, -50, 0);
      c.quadraticCurveTo(0, 12, 50, 0);
      c.bezierCurveTo(64, -12, 58, -40, 40, -66);
      c.closePath();
    };
  body();
  c.fillStyle = linear(c, -60, 0, 60, 0, [STALK.mid, STALK.hi, STALK.lit, STALK.mid, STALK.low]);
  c.fill();
  inside(c, body, () => {
    const rand = seeded(31 + frame);
    for (let i = 0; i < 12; i++) {
      const y = -64 + rand() * 64;
      c.beginPath();
      c.moveTo(-70, y);
      c.quadraticCurveTo(0, y + 8, 70, y);
      line(c, STALK.low, 1.6, 0.42);
    }
    // his eyes and mouth, smeared by the spin as they come round the front
    const u = wrap(turn),
      front = Math.cos((u - 0.5) * TAU),
      fx = Math.sin((u - 0.5) * TAU) * 40;
    if (front > -0.2) {
      c.globalAlpha = 0.45 + front * 0.5;
      for (const side of [-1, 1]) {
        ellipse(c, fx + side * 16 * front, -44, 11 * Math.max(0.3, front) + 5, 5);
        c.fillStyle = INK;
        c.fill();
      }
      ellipse(c, fx, -24, 14 * Math.max(0.3, front) + 4, 4);
      c.fillStyle = '#4a1230';
      c.fill();
      c.globalAlpha = 1;
    }
  });
  body();
  line(c, INK, 3.2);
  const dome = () => {
    c.beginPath();
    c.moveTo(-92, -60);
    c.bezierCurveTo(-90, -100, -46, -124, 0, -124);
    c.bezierCurveTo(46, -124, 90, -100, 92, -60);
    c.bezierCurveTo(56, -40, -56, -40, -92, -60);
    c.closePath();
  };
  dome();
  c.fillStyle = radial(c, -6, -84, 106, [p.hi, p.lit, p.mid, p.low], -30, -104);
  c.fill();
  inside(c, dome, () => {
    c.fillStyle = linear(c, 0, -76, 0, -42, [rgba(p.low, 0), p.rim]);
    c.fillRect(-96, -76, 192, 36);
    // spots sliding round, wide in the middle and thin at the edges, each with a streak behind it
    for (let i = 0; i < 8; i++) {
      const u = wrap(i / 8 + turn),
        a = (u - 0.5) * Math.PI,
        sx = Math.sin(a) * 84,
        wide = Math.cos(a) * 20 + 3,
        y = -80 - ((i * 37) % 3) * 11;
      ellipse(c, sx, y, wide, 7.5);
      c.fillStyle = rgba(p.spot, 0.95);
      c.fill();
      c.beginPath();
      c.moveTo(sx - wide - 2, y);
      c.lineTo(sx - wide - 26 * Math.cos(a), y);
      line(c, p.spot, 3, 0.4);
    }
  });
  dome();
  line(c, INK, 3.6);
}

// One arc of air round him, on its way round. (0, 0) is its middle.
function drawWhirlArc(c: Ctx, frame: number) {
  const from = 0.3 + frame * 0.42;
  c.beginPath();
  c.ellipse(0, 0, 112, 18, 0, from, from + 2.3);
  line(c, '#f0d8ff', 3.4, 0.75);
}

// A spore pod: it can be shot, so it looks like something alive, small and grumpy. (0, 0) is its middle.
function drawPod(c: Ctx) {
  const { out, deep, mid, lit, hi } = MO_PALETTE.acid;
  blob(c, 0, 0, 15, seeded(7), 14, 0.14);
  c.fillStyle = radial(c, 0, 0, 18, [hi, lit, mid, deep], -5, -6);
  c.fill();
  line(c, out, 2.6);
  for (const [x, y, r] of [
    [-7, 7, 2.2],
    [8, 5, 1.8],
    [8, -8, 1.6],
  ] as const) {
    circle(c, x, y, r);
    c.fillStyle = deep;
    c.fill();
  }
  for (const side of [-1, 1]) {
    ellipse(c, side * 5, -2, 2, 2.6);
    c.fillStyle = INK;
    c.fill();
    c.beginPath();
    c.moveTo(side * 9, -7);
    c.lineTo(side * 2, -5);
    line(c, INK, 1.8);
  }
  c.beginPath();
  c.arc(0, 8, 3.4, 1.15 * Math.PI, 1.85 * Math.PI);
  line(c, INK, 1.8);
}

export function bakeMoParts(scene: Scene) {
  MO_PALETTE.caps.forEach((p, i) => {
    bake(scene, `mo-cap-${i}`, 224, 124, 112, 72, (c) => drawCap(c, p));
    bake(scene, `mo-cap-glow-${i}`, 250, 140, 125, 80, (c) => drawCapGlow(c, p), SOFT);
  });
  bake(scene, 'mo-gills', 200, 66, 100, 8, drawGills);
  bake(scene, 'mo-foot', 160, 76, 80, 66, drawFoot);
  bake(scene, 'mo-stalk', STALK_LEN, STALK_THICK, 0, STALK_THICK / 2, drawStalkStrip);
  bake(scene, 'mo-skirt', 110, 46, 55, 12, drawSkirt);
  bake(scene, 'mo-arm', 62, 34, 4, 17, drawArm);
  for (let i = 0; i < WHIRL_FRAMES; i++) {
    bake(scene, `mo-whirl-${i}`, 210, 140, 105, 130, (c) => drawWhirl(c, i));
    bake(scene, `mo-whirl-arc-${i}`, 240, 44, 120, 22, (c) => drawWhirlArc(c, i), SOFT);
  }
  bake(scene, 'mo-pool', 240, 40, 120, 20, (c) => glow(c, 0, 0, 118, '#ffffff', 1, 19), SOFT);
  bake(scene, 'mo-shadow', 200, 30, 100, 15, (c) => glow(c, 0, 0, 98, INK, 0.75, 14), SOFT);
  // the spots he sheds as his mood changes: baked in white and tinted, like every particle (see fx.ts)
  bake(scene, 'fx-spot', 26, 20, 13, 10, (c) => {
    ellipse(c, 0, 0, 11, 8);
    c.fillStyle = radial(c, 0, 0, 11, ['#ffffff', '#dcdcdc'], -3, -3);
    c.fill();
  });
  bake(scene, 'spore-pod', 40, 40, 20, 20, drawPod);
  bake(scene, 'spore-halo', 64, 64, 32, 32, (c) => glow(c, 0, 0, 31, MO_PALETTE.acid.lit, 0.55), SOFT);
}
