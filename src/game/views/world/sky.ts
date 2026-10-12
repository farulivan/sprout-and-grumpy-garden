// The sky: one gradient per mood (cross-faded), the sun with its glow and turning rays, drifting clouds,
// the storm clouds that roll in from above, and the rainbow that comes out when Sunny cheers up.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, H, TAU, W } from '../../../config';
import { bake, INV, part, show, SOFT, unit } from '../../art/bake';
import { rgba } from '../../art/color';
import { circle, glow, linear, radial, roundRect, seeded, type Ctx, type Stops } from '../../art/draw';
import type { FaceMood } from '../../art/face';
import { HAZY } from '../../art/shared';
import { bakeFaces, faceKey } from '../faces';
import { MOODS, type Mood, type Weather } from './weather';

// Background layers are this much wider than the screen on each side, so they can slide (parallax).
export const PAD = 48;
const SUN = { x: 132, y: 92 };

const SKIES: Record<Mood, Stops> = {
  calm: [
    [0, '#3ea5f2'],
    [0.42, '#7fcbff'],
    [0.72, '#c2e9ff'],
    [0.88, '#e9f8f0'],
    [1, '#f7fbdf'],
  ],
  grumpy: [
    [0, '#58789f'],
    [0.45, '#8ea5c2'],
    [0.76, '#c4cfda'],
    [1, '#e2dfcf'],
  ],
  stormy: [
    [0, '#29264f'],
    [0.34, '#463a78'],
    [0.6, '#85598f'],
    [0.78, '#d4867b'],
    [1, '#f3b98c'],
  ],
  bloom: [
    [0, '#2aa6ff'],
    [0.4, '#7bd3ff'],
    [0.68, '#c6efff'],
    [0.86, '#fff5cc'],
    [1, '#ffe7a3'],
  ],
};

// [width, height] of each cloud shape
const CLOUD_SHAPES = [
  [172, 60],
  [226, 76],
  [124, 46],
] as const;
// [shape, x, y, size, speed in px/s, opacity]: the small, pale, slow ones read as further away
const CLOUDS = [
  [2, 60, 196, 0.55, 3, 0.75],
  [0, 330, 168, 0.6, 3.5, 0.78],
  [2, 610, 212, 0.5, 2.6, 0.7],
  [1, 880, 150, 0.62, 4, 0.8],
  [1, 250, 84, 0.95, 8, 0.96],
  [0, 560, 112, 0.84, 6.5, 0.94],
  [2, 820, 62, 1.05, 9, 0.96],
  [0, 1010, 126, 0.9, 7, 0.94],
] as const;
const CLOUD_LOOP = W + 320; // clouds wrap around after drifting this far
const CEILING_W = W + PAD * 2 + 240;
const CEILING_H = 190;

// A cumulus cloud resting on a flat base at y = 0: white where the light catches it, lavender underneath.
function drawCloud(c: Ctx, rand: () => number, w: number, h: number) {
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const u = i / 4,
      r = h * (0.3 + 0.24 * Math.sin(u * Math.PI) + rand() * 0.07);
    lumps.push([(u - 0.5) * (w - h * 0.8), -r * 0.72 - Math.sin(u * Math.PI) * h * 0.16, r]);
  }
  const pass = (dx: number, dy: number, k: number, color: string) => {
    c.fillStyle = color;
    for (const [x, y, r] of lumps) {
      circle(c, x + dx, y + dy, r * k);
      c.fill();
    }
    roundRect(c, -w / 2 + dx, -h * 0.44 + dy, w, h * 0.44, h * 0.22);
    c.fill();
  };
  pass(0, 0, 1, '#c3d0ee');
  pass(-2.5, -4, 0.93, '#ffffff');
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = linear(c, 0, -h * 0.55, 0, 2, ['rgba(146,166,220,0)', 'rgba(146,166,220,0.55)']);
  c.fillRect(-w, -h * 1.3, w * 2, h * 1.5);
  c.globalCompositeOperation = 'source-over';
}

// The underside of a heavy cloud bank, hanging down from the top of the screen.
function drawCeiling(c: Ctx, rand: () => number) {
  const lumps: [number, number, number][] = [];
  for (let x = -20; x < CEILING_W + 40; x += 34 + rand() * 30) {
    const r = 34 + rand() * 30;
    lumps.push([x, 84 + rand() * 44 - r * 0.3, r]);
  }
  const pass = (dx: number, dy: number, k: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(0, 0, CEILING_W, 96 + dy);
    for (const [x, y, r] of lumps) {
      circle(c, x + dx, y + dy, r * k);
      c.fill();
    }
  };
  pass(0, 0, 1, '#9da4c4');
  pass(-3, -7, 0.9, '#eef0f8');
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = linear(c, 0, 20, 0, CEILING_H, ['rgba(80,84,130,0)', 'rgba(80,84,130,0.6)']);
  c.fillRect(0, 0, CEILING_W, CEILING_H);
  c.globalCompositeOperation = 'source-over';
}

export function bakeSky(scene: Scene) {
  for (const mood of MOODS)
    bake(
      scene,
      `sky-${mood}`,
      8,
      H + PAD * 2,
      0,
      PAD,
      (c) => {
        // taller than the screen as well as wider, so a screen shake never shows past its edge
        c.fillStyle = linear(c, 0, 0, 0, GROUND, SKIES[mood]);
        c.fillRect(0, -PAD, 8, H + PAD * 2);
      },
      SOFT,
    );

  // high wispy streaks
  bake(
    scene,
    'sky-wisps',
    640,
    200,
    0,
    0,
    (c) => {
      const rand = seeded(11);
      for (let i = 0; i < 12; i++)
        glow(
          c,
          60 + rand() * 520,
          30 + rand() * 140,
          70 + rand() * 110,
          '#ffffff',
          0.2 + rand() * 0.2,
          5 + rand() * 7,
        );
    },
    HAZY,
  );

  bake(
    scene,
    'sun-glow',
    380,
    380,
    190,
    190,
    (c) => {
      c.fillStyle = radial(c, 0, 0, 190, [
        [0, 'rgba(255,251,220,0.95)'],
        [0.2, 'rgba(255,242,176,0.62)'],
        [0.5, 'rgba(255,228,140,0.2)'],
        [1, 'rgba(255,220,130,0)'],
      ]);
      c.fillRect(-190, -190, 380, 380);
    },
    HAZY,
  );
  bake(
    scene,
    'sun-rays',
    580,
    580,
    290,
    290,
    (c) => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU,
          len = i % 2 ? 196 : 284,
          half = i % 2 ? 0.055 : 0.085;
        c.fillStyle = radial(c, 0, 0, len, [
          [0, 'rgba(255,246,198,0)'],
          [0.16, 'rgba(255,246,198,0.62)'],
          [1, 'rgba(255,246,198,0)'],
        ]);
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, len, a - half, a + half);
        c.closePath();
        c.fill();
      }
    },
    HAZY,
  );
  bake(scene, 'sun-disc', 104, 104, 52, 52, (c) => {
    circle(c, 0, 0, 43);
    c.fillStyle = radial(c, 0, 0, 46, ['#fffce2', '#ffee93', '#ffcb52'], -13, -15);
    c.fill();
    c.lineWidth = 3.5;
    c.strokeStyle = '#f6a933';
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.arc(0, 0, 38, Math.PI * 1.05, Math.PI * 1.6);
    c.stroke();
  });
  bakeFaces(scene, 'sun', 1.3, ['happy', 'joy', 'worried']);

  CLOUD_SHAPES.forEach(([w, h], i) =>
    bake(scene, `cloud-${i}`, w + 20, h * 1.25 + 14, w / 2 + 10, h * 1.25 + 8, (c) =>
      drawCloud(c, seeded(31 + i * 7), w, h),
    ),
  );
  bake(scene, 'cloud-ceiling', CEILING_W, CEILING_H, 0, 0, (c) => drawCeiling(c, seeded(9)), SOFT);

  // origin at the middle of the arc's base
  bake(
    scene,
    'rainbow',
    840,
    410,
    420,
    410,
    (c) => {
      const bands = ['#ff6f7d', '#ffa75e', '#ffe36a', '#82e28e', '#6fcbff', '#9d8fff', '#d590ff'];
      c.lineCap = 'butt';
      c.lineWidth = 11;
      bands.forEach((color, i) => {
        c.beginPath();
        c.arc(0, 0, 398 - i * 10, Math.PI, TAU);
        c.strokeStyle = rgba(color, i === 0 || i === bands.length - 1 ? 0.5 : 0.7);
        c.stroke();
      });
    },
    SOFT,
  );
}

interface Cloud {
  image: GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  alpha: number;
}

export class Sky {
  private skies: Record<Mood, GameObjects.Image>;
  private wisps: GameObjects.Image[];
  private rainbow: GameObjects.Image;
  private glow: GameObjects.Image;
  private rays: GameObjects.Image;
  private rays2: GameObjects.Image;
  private glowUnit: number; // the glow and the rays are baked small: these scales show them at full size
  private raysUnit: number;
  private disc: GameObjects.Image;
  private face: GameObjects.Image;
  private clouds: Cloud[];
  private ceiling: GameObjects.Image[];
  private drift = 0;

  constructor(scene: Scene, layer: GameObjects.Container) {
    const sky = (mood: Mood) => part(scene, `sky-${mood}`, -PAD, 0).setScale((W + PAD * 2) / 8, 1);
    this.skies = { calm: sky('calm'), grumpy: sky('grumpy'), stormy: sky('stormy'), bloom: sky('bloom') };
    const wisp = unit('sky-wisps');
    this.wisps = [0, 1].map((i) =>
      part(scene, 'sky-wisps', i * 640, 20 + i * 30).setScale(wisp * 1.6, wisp * 1.2),
    );
    this.raysUnit = unit('sun-rays');
    this.rainbow = part(scene, 'rainbow', 430, 500).setAlpha(0);
    this.glow = part(scene, 'sun-glow', SUN.x, SUN.y).setBlendMode(BlendModes.ADD);
    this.glowUnit = unit('sun-glow');
    this.rays = part(scene, 'sun-rays', SUN.x, SUN.y).setBlendMode(BlendModes.ADD);
    this.rays2 = part(scene, 'sun-rays', SUN.x, SUN.y).setBlendMode(BlendModes.ADD);
    this.disc = part(scene, 'sun-disc', SUN.x, SUN.y);
    this.face = part(scene, faceKey('sun', 'happy'), SUN.x, SUN.y + 3);
    this.clouds = CLOUDS.map(([shape, x, y, size, speed, alpha]) => ({
      image: part(scene, `cloud-${shape}`, x, y).setScale(INV * size),
      x,
      y,
      speed,
      alpha,
    }));
    this.ceiling = [0, 1].map((i) =>
      part(scene, 'cloud-ceiling', 0, 0)
        .setFlipX(i === 1)
        .setAlpha(i === 0 ? 0.75 : 1),
    );

    layer.add([
      ...Object.values(this.skies),
      this.glow,
      this.rays2,
      this.rays,
      this.rainbow,
      ...this.wisps,
      this.disc,
      this.face,
      ...this.clouds.map((c) => c.image),
      ...this.ceiling,
    ]);
  }

  // t = seconds the world has been running, pan = -1..1 (where the camera would be looking).
  sync(t: number, dt: number, weather: Weather, pan: number, sunMood: FaceMood, blink: boolean) {
    const { look, weight } = weather;

    // Stacked back to front as calm, grumpy, stormy, bloom; these opacities add up to the weighted blend.
    const top = 1 - weight.bloom,
      mid = top - weight.stormy,
      grumpy = mid > 0.001 ? weight.grumpy / mid : 0,
      stormy = top > 0.001 ? weight.stormy / top : 0,
      solid = 0.997, // a sky this opaque hides the ones under it, so they need not be drawn
      faint = 0.004;
    this.skies.bloom.setAlpha(weight.bloom).setVisible(weight.bloom > faint);
    this.skies.stormy.setAlpha(stormy).setVisible(stormy > faint && weight.bloom < solid);
    this.skies.grumpy.setAlpha(grumpy).setVisible(grumpy > faint && weight.bloom < solid && stormy < solid);
    this.skies.calm.setVisible(weight.bloom < solid && stormy < solid && grumpy < solid);

    this.wisps.forEach((w, i) =>
      w
        .setX(((i * 760 - t * 2.2 + 4000) % 1520) - 620 + pan * 14)
        .setTint(look.cloudTint)
        .setAlpha(0.75),
    );

    const sx = SUN.x + pan * 15,
      sy = SUN.y - look.ceiling * 64, // it ducks behind the storm clouds
      sun = look.sun,
      pulse = 1 + Math.sin(t * 1.3) * 0.03;
    const shining = sun > 0.08; // behind the storm clouds there is nothing left to draw
    this.glow
      .setVisible(shining)
      .setPosition(sx, sy)
      .setAlpha(Math.min(1, sun * 0.9))
      .setScale(this.glowUnit * pulse * (0.9 + sun * 0.12));
    this.rays
      .setVisible(shining)
      .setPosition(sx, sy)
      .setRotation(t * 0.05)
      .setAlpha(Math.min(1, sun * 0.34))
      .setScale(this.raysUnit * (0.92 + sun * 0.1));
    this.rays2
      .setVisible(shining)
      .setPosition(sx, sy)
      .setRotation(-t * 0.033 + 0.2)
      .setAlpha(Math.min(1, sun * 0.17))
      .setScale(this.raysUnit * (1.25 + Math.sin(t * 0.9) * 0.04));
    const shade = Math.round(150 + 105 * Math.min(1, sun));
    this.disc
      .setPosition(sx, sy + Math.sin(t * 0.9) * 1.5)
      .setTint((shade << 16) | (shade << 8) | Math.min(255, shade + 20));
    show(this.face, faceKey('sun', sunMood, blink));
    this.face.setPosition(sx, this.disc.y + 3).setAlpha(0.45 + 0.55 * Math.min(1, sun));
    this.rainbow.setX(430 + pan * 13).setAlpha(look.rainbow * 0.85);

    this.drift += dt * (1 + look.wind * 5);
    this.clouds.forEach((c, i) => {
      const far = i < 4;
      c.image
        .setPosition(
          ((((c.x - this.drift * c.speed) % CLOUD_LOOP) + CLOUD_LOOP) % CLOUD_LOOP) -
            160 +
            pan * (far ? 13 : 11),
          c.y + Math.sin(t * 0.4 + i) * 2,
        )
        .setTint(look.cloudTint)
        .setAlpha(c.alpha);
    });

    // the storm bank slides down from above the screen; two copies drift at different speeds
    this.ceiling.forEach((img, i) => {
      const down = Math.min(1, look.ceiling * (i === 0 ? 1.15 : 1));
      img
        .setPosition(
          -PAD - 120 + Math.sin(t * (0.12 + i * 0.07) + i * 2) * 110 + pan * 9,
          -CEILING_H + down * (CEILING_H - 62 + i * 26),
        )
        .setTint(look.cloudTint)
        .setVisible(look.ceiling > 0.01);
    });
  }
}
