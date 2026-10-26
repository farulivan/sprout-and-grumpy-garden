// What hangs in the air: shafts of sunlight, floating pollen, a few butterflies, gusts of wind when Sunny
// is furious, and the soft darkening toward the corners of the screen.
// The butterflies and gusts live behind the fight, where they can't be mistaken for something to dodge.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, H, W } from '../../../config';
import { bake, part, SOFT } from '../../art/bake';
import { circle, ellipse, glow, line, linear, radial, seeded } from '../../art/draw';
import type { Weather } from './weather';

const SHAFTS = [
  [70, -0.34, 1, 0.2],
  [190, -0.52, 1.5, 0.15],
  [20, -0.74, 0.8, 0.13],
] as const; // [x, lean, width, brightness]
const WING_COLORS = [
  ['#ffd0e6', '#ff8fc0', '#d95a9a'],
  ['#fff1a8', '#ffc94a', '#e0932a'],
  ['#cfe6ff', '#8fbfff', '#5a8fe0'],
] as const;
const BUTTERFLIES = [
  [236, 396, 0],
  [540, 372, 1],
  [110, 322, 2],
] as const; // [home x, home y, colour]
const MOTES = 26,
  GUSTS = 6;

export function bakeAir(scene: Scene) {
  bake(
    scene,
    'shaft',
    200,
    640,
    100,
    0,
    (c) => {
      c.fillStyle = linear(c, -100, 0, 100, 0, [
        'rgba(255,250,214,0)',
        'rgba(255,250,214,0.6)',
        'rgba(255,250,214,0)',
      ]);
      c.fillRect(-100, 0, 200, 640);
      // fade out toward the ground
      c.globalCompositeOperation = 'destination-in';
      c.fillStyle = linear(c, 0, 0, 0, 640, [
        [0, 'rgba(0,0,0,0.9)'],
        [0.55, 'rgba(0,0,0,0.45)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      c.fillRect(-100, 0, 200, 640);
      c.globalCompositeOperation = 'source-over';
    },
    SOFT,
  );
  bake(scene, 'mote', 16, 16, 8, 8, (c) => glow(c, 0, 0, 8, '#ffffff', 1), SOFT);
  bake(
    scene,
    'gust',
    240,
    22,
    0,
    11,
    (c) => {
      const stroke = linear(c, 0, 0, 240, 0, [
        'rgba(255,255,255,0)',
        'rgba(255,255,255,0.85)',
        'rgba(255,255,255,0)',
      ]);
      c.strokeStyle = stroke;
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(4, 2);
      c.quadraticCurveTo(120, -8, 236, 3);
      c.stroke();
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(50, 7);
      c.quadraticCurveTo(130, 1, 200, 8);
      c.stroke();
    },
    SOFT,
  );

  // right wing, hinged at (0, 0)
  WING_COLORS.forEach(([light, mid, dark], i) =>
    bake(scene, `wing-${i}`, 22, 30, 2, 15, (c) => {
      const rand = seeded(80 + i);
      const lobe = (x: number, y: number, rx: number, ry: number, rot: number) => {
        ellipse(c, x, y, rx, ry, rot);
        c.fillStyle = radial(c, x, y, rx * 1.2, [light, mid], 0, 0);
        c.fill();
        line(c, dark, 1.3);
      };
      lobe(8.5, 5.5, 8, 6, 0.5);
      lobe(9, -5.5, 10, 8, -0.5);
      for (let n = 0; n < 3; n++) {
        circle(c, 9 + rand() * 6, -8 + rand() * 6, 1.4);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.fill();
      }
    }),
  );
  bake(scene, 'butterfly-body', 8, 20, 4, 10, (c) => {
    ellipse(c, 0, 0, 1.8, 7);
    c.fillStyle = '#5a4034';
    c.fill();
  });
}

interface Mote {
  image: GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}
interface Butterfly {
  root: GameObjects.Container;
  wings: [GameObjects.Image, GameObjects.Image];
  home: readonly [number, number, number];
  away: number; // 0 = fluttering about, 1 = flown off
}
interface Gust {
  image: GameObjects.Image;
  x: number;
  y: number;
  speed: number;
}

export class Air {
  private shafts: GameObjects.Image[];
  private gusts: Gust[];
  private butterflies: Butterfly[];
  private motes: Mote[];
  private vignette: GameObjects.Image;
  private dusk: GameObjects.Image;
  private dim = 0;
  private rand = seeded(7);

  // The weather has turned at once (Weather.snap): the butterflies are already where it would have sent them.
  settle(weather: Weather) {
    for (const b of this.butterflies) b.away = weather.look.life > 0.5 ? 0 : 1;
  }

  // `layer` is behind the fight; depth.front is in front of it.
  constructor(scene: Scene, layer: GameObjects.Container, depth: { front: number }) {
    this.shafts = SHAFTS.map(([x, lean, width]) =>
      part(scene, 'shaft', x, -70)
        .setRotation(lean)
        .setScale(width * 1.15, 1.15)
        .setBlendMode(BlendModes.ADD),
    );
    this.gusts = Array.from({ length: GUSTS }, () => ({
      image: part(scene, 'gust').setVisible(false),
      x: -999,
      y: 0,
      speed: 0,
    }));
    this.butterflies = BUTTERFLIES.map((home) => {
      const wings: [GameObjects.Image, GameObjects.Image] = [
        part(scene, `wing-${home[2]}`),
        part(scene, `wing-${home[2]}`),
      ];
      const root = scene.add.container(home[0], home[1], [...wings, part(scene, 'butterfly-body')]);
      return { root, wings, home, away: 0 };
    });
    layer.add([...this.shafts, ...this.gusts.map((g) => g.image), ...this.butterflies.map((b) => b.root)]);

    this.motes = Array.from({ length: MOTES }, () => ({
      image: part(scene, 'mote')
        .setBlendMode(BlendModes.ADD)
        .setTint(0xfff3c4)
        .setDepth(depth.front + 0.2),
      x: this.rand() * W,
      y: this.rand() * GROUND,
      vx: -4 + this.rand() * 10,
      vy: -3 - this.rand() * 7,
      phase: this.rand() * 6.28,
      size: 0.16 + this.rand() * 0.32,
    }));
    const cover = (key: string) => part(scene, key).setDepth(depth.front + 0.1);
    this.dusk = cover('white')
      .setDisplaySize(W + 80, H + 80)
      .setPosition(-40, -40)
      .setTint(0x101a3a)
      .setAlpha(0);
    this.vignette = cover('vignette')
      .setDisplaySize(W + 80, H + 80)
      .setPosition(-40, -40);
  }

  // napping = Pip is down: the light goes soft and sleepy. viewX: the world x of the view's left edge, when
  // the camera moves (on a stage); the parts in front of everything follow it.
  sync(t: number, dt: number, weather: Weather, pan: number, napping: boolean, viewX = 0) {
    const { look } = weather,
      wind = look.wind;

    SHAFTS.forEach(([x, , , bright], i) =>
      this.shafts[i]
        .setX(x + pan * 14)
        .setAlpha(Math.min(1, look.sun) * bright * (0.75 + 0.25 * Math.sin(t * 0.7 + i * 2.1)))
        .setVisible(look.sun > 0.06),
    );

    for (const g of this.gusts) {
      g.x -= g.speed * dt;
      if (g.x < -260) {
        // a new gust starts beyond the right edge, more often the harder it blows
        if (wind < 0.05 || this.rand() > dt * (0.6 + wind * 2.4)) {
          g.image.setVisible(false);
          continue;
        }
        g.x = W + 20 + this.rand() * 200;
        g.y = 110 + this.rand() * 300;
        g.speed = 520 + this.rand() * 420;
        g.image.setScale(0.7 + this.rand() * 0.8, 1);
      }
      g.image
        .setVisible(true)
        .setPosition(g.x, g.y + Math.sin(g.x * 0.01) * 6)
        .setAlpha(Math.min(0.5, wind * 0.5));
    }

    this.butterflies.forEach((b, i) => {
      // they leave when the weather turns and come back when it clears
      b.away += ((look.life > 0.5 ? 0 : 1) - b.away) * Math.min(1, dt * 0.9);
      const [hx, hy] = b.home,
        x = hx + Math.sin(t * 0.55 + i * 2.1) * 70 + Math.sin(t * 1.7 + i) * 14 + pan * 6,
        y = hy + Math.sin(t * 0.8 + i * 1.3) * 26 + Math.sin(t * 5.2 + i) * 4 - b.away * 330;
      const flap = 0.15 + 0.85 * Math.abs(Math.sin(t * 13 + i * 1.9));
      b.root
        .setPosition(x, y)
        .setRotation(Math.cos(t * 0.55 + i * 2.1) * 0.35)
        .setScale(0.62)
        .setVisible(b.away < 0.98);
      b.wings[0].setScale(0.5 * flap, 0.5);
      b.wings[1].setScale(-0.5 * flap, 0.5);
    });

    for (const m of this.motes) {
      m.x += (m.vx - wind * 160) * dt;
      m.y += m.vy * dt;
      if (m.y < -10) m.y = GROUND + 4;
      if (m.x < -10) m.x = W + 8;
      if (m.x > W + 10) m.x = -8;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.4 + m.phase);
      m.image
        .setPosition(viewX + m.x + Math.sin(t * 0.9 + m.phase) * 9, m.y)
        .setScale(m.size * (0.8 + 0.4 * twinkle))
        .setAlpha(Math.min(1, look.life) * (0.25 + 0.5 * twinkle) + wind * 0.12);
    }

    this.dim += ((napping ? 0.34 : 0) - this.dim) * Math.min(1, dt * 1.6);
    this.dusk
      .setAlpha(this.dim)
      .setVisible(this.dim > 0.01)
      .setX(viewX - 40);
    this.vignette
      .setTint(look.vignetteTint)
      .setAlpha(Math.min(1, look.vignette + this.dim * 0.4))
      .setX(viewX - 40);
  }
}
