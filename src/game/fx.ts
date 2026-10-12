// Particles, shockwave rings, the flash of light on big moments, screen shake and the camera's little
// "punch" zoom. Every particle shape is baked in white and tinted, so one texture serves every colour;
// "glow" particles are drawn as light (added to what is behind them) instead of as paint.
import { BlendModes, type Cameras, type GameObjects, type Scene } from 'phaser';
import { H, RES, TAU, W } from '../config';
import type { Burst, ParticleShape, Ring } from '../presentation';
import { bake, hex, INV, part, show, SOFT, unit } from './art/bake';
import {
  blob,
  circle,
  glow,
  heart,
  leaf,
  line,
  radial,
  roundRect,
  seeded,
  sparkle,
  type Ctx,
} from './art/draw';

const UNIT = 8; // the size every shape is baked at
// A ring is a baked circle scaled up as it spreads, which thickens its line. So there are two: a small
// one for hits and a big one, with a finer line, for the shockwaves that cross half the screen.
const RING_R = 30,
  BIG_RING_R = 190,
  BIG_RING_FROM = 100; // rings that grow beyond this radius use the big one
const MAX_PARTICLES = 420; // beyond this, new bursts are dropped rather than slowing the game down
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Shapes are grey where they should take the tint a little darker, white where they should stay bright.
const SHAPES: Record<ParticleShape, [w: number, h: number, draw: (c: Ctx) => void]> = {
  circle: [
    18,
    18,
    (c) => {
      circle(c, 0, 0, UNIT);
      c.fillStyle = '#fff';
      c.fill();
    },
  ],
  soft: [20, 20, (c) => glow(c, 0, 0, 10, '#ffffff', 1)],
  leaf: [
    34,
    18,
    (c) => {
      leaf(c, -14, 0, 28, 7.5, 0, 0.45, 0.8);
      c.fillStyle = '#f2f2f2';
      c.fill();
      c.beginPath();
      c.moveTo(-10, 0);
      c.lineTo(11, 0);
      line(c, '#b8b8b8', 1.4);
    },
  ],
  petal: [
    34,
    22,
    (c) => {
      leaf(c, -13, 0, 26, 10, 0, 0.55, 0.6);
      c.fillStyle = radial(c, 2, 0, 16, ['#ffffff', '#d9d9d9'], -4, -3);
      c.fill();
    },
  ],
  heart: [
    30,
    26,
    (c) => {
      heart(c, 0, 0, UNIT);
      c.fillStyle = '#e9e9e9';
      c.fill();
      circle(c, -4.5, -4, 2.6);
      c.fillStyle = '#fff';
      c.fill();
    },
  ],
  star: [
    22,
    22,
    (c) => {
      glow(c, 0, 0, 10, '#ffffff', 0.5);
      sparkle(c, 0, 0, 10);
      c.fillStyle = '#fff';
      c.fill();
    },
  ],
  // a streak; it is stretched along the way it is flying
  spark: [
    36,
    10,
    (c) => {
      c.fillStyle = radial(c, 0, 0, 16, ['rgba(255,255,255,1)', 'rgba(255,255,255,0)']);
      c.save();
      c.scale(1, 0.22);
      c.fillRect(-18, -18, 36, 36);
      c.restore();
    },
  ],
  puff: [
    30,
    28,
    (c) => {
      for (const [x, y, r] of [
        [-5, 2, 8],
        [5, 2, 8],
        [0, -4, 8.5],
      ])
        glow(c, x, y, r * 1.35, '#ffffff', 1);
    },
  ],
  clod: [
    20,
    20,
    (c) => {
      blob(c, 0, 0, 7, seeded(4), 7, 0.3);
      c.fillStyle = '#ededed';
      c.fill();
      circle(c, -2, -2, 2.4);
      c.fillStyle = '#fff';
      c.fill();
    },
  ],
  confetti: [
    20,
    14,
    (c) => {
      roundRect(c, -8, -5, 16, 10, 2.5);
      c.fillStyle = '#fff';
      c.fill();
      c.fillStyle = '#dcdcdc';
      c.fillRect(-8, 0, 16, 5);
    },
  ],
};

export function bakeFx(scene: Scene) {
  for (const [shape, [w, h, draw]] of Object.entries(SHAPES))
    bake(scene, `fx-${shape}`, w, h, w / 2, h / 2, draw);
  bake(scene, 'fx-ring', 72, 72, 36, 36, (c) => {
    circle(c, 0, 0, RING_R);
    line(c, '#ffffff', 5);
  });
  bake(
    scene,
    'fx-ring-big',
    BIG_RING_R * 2 + 24,
    BIG_RING_R * 2 + 24,
    BIG_RING_R + 12,
    BIG_RING_R + 12,
    (c) => {
      circle(c, 0, 0, BIG_RING_R);
      line(c, '#ffffff', 14, 0.3);
      line(c, '#ffffff', 6);
    },
    SOFT,
  );
}

interface Particle {
  image: GameObjects.Image;
  shape: ParticleShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  alpha: number;
  gravity: number;
  drag: number;
  rot: number;
  vr: number;
}
interface Wave {
  image: GameObjects.Image;
  big: boolean;
  x: number;
  y: number;
  life: number;
  max: number;
  from: number;
  to: number;
}

export class Fx {
  private particles: Particle[] = [];
  private spare: GameObjects.Image[] = [];
  private waves: Wave[] = [];
  private spareRings: Record<'small' | 'big', GameObjects.Image[]> = { small: [], big: [] };
  private light: GameObjects.Image;
  private lightA = 0;
  private shakePx = 0;
  private punchK = 0;
  private camera: Cameras.Scene2D.Camera;
  // People who ask their device for less motion get a gentler shake, a fainter flash and no camera jolt.
  private gentle = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(
    private scene: Scene,
    private depth: number,
    frontDepth: number,
  ) {
    this.camera = scene.cameras.main;
    this.light = part(scene, 'white', -60, -60)
      .setDisplaySize(W + 120, H + 120)
      .setBlendMode(BlendModes.ADD)
      .setDepth(frontDepth)
      .setVisible(false);
  }

  burst(x: number, y: number, b: Burst) {
    const { n = 8, color = '#fff', colors, speed = 120, size = 4, life = 0.5, gravity = 300 } = b;
    const { shape = 'circle', spread = TAU, dir = 0, glow = false, alpha = 1, drag = 0, radius = 0 } = b;
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = dir + (Math.random() - 0.5) * spread,
        s = speed * rand(0.4, 1),
        from = radius ? rand(0, TAU) : 0,
        off = radius ? Math.sqrt(Math.random()) * radius : 0;
      const image = this.spare.pop() ?? part(this.scene, 'fx-circle').setDepth(this.depth);
      show(image, `fx-${shape}`);
      image
        .setTint(hex(colors ? colors[i % colors.length] : color))
        .setBlendMode(glow ? BlendModes.ADD : BlendModes.NORMAL)
        .setVisible(true);
      const p: Particle = {
        image,
        shape,
        x: x + Math.cos(from) * off,
        y: y + Math.sin(from) * off,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * rand(0.75, 1),
        max: life,
        size: size * rand(0.6, 1.3),
        alpha,
        gravity,
        drag: drag || (shape === 'leaf' || shape === 'petal' || shape === 'confetti' ? 0.6 : 0),
        rot: rand(0, TAU),
        vr: rand(-6, 6),
      };
      this.particles.push(p);
      this.place(p);
    }
  }

  // A circle of light that spreads out from a point: the "thump" of a hit.
  ring(x: number, y: number, r: Ring) {
    const { color = '#fff', from = 8, to = 60, life = 0.3, glow = true } = r;
    const big = to > BIG_RING_FROM;
    const image = (
      this.spareRings[big ? 'big' : 'small'].pop() ??
      part(this.scene, big ? 'fx-ring-big' : 'fx-ring').setDepth(this.depth)
    )
      .setTint(hex(color))
      .setBlendMode(glow ? BlendModes.ADD : BlendModes.NORMAL)
      .setVisible(true);
    this.waves.push({ image, big, x, y, life, max: life, from, to });
  }

  // A wash of light over the whole screen that fades at once.
  flash(alpha: number, color = '#ffffff') {
    this.lightA = Math.max(this.lightA, this.gentle ? alpha * 0.35 : alpha);
    this.light.setTint(hex(color));
  }
  // px = how far the picture may jump; it settles by itself.
  shake(px: number) {
    this.shakePx = Math.max(this.shakePx, this.gentle ? px * 0.35 : px);
  }
  // amount = how far the camera jolts in (0.04 = 4%); it settles by itself.
  punch(amount: number) {
    if (!this.gentle) this.punchK = Math.max(this.punchK, amount);
  }

  // A new fight starts clean.
  clear() {
    for (const p of this.particles) this.retire(p);
    this.particles.length = 0;
    for (const w of this.waves) this.spareRings[w.big ? 'big' : 'small'].push(w.image.setVisible(false));
    this.waves.length = 0;
    this.shakePx = this.punchK = this.lightA = 0;
  }

  // dt drives the particles (slowed during the win slow-motion); realDt settles the camera in real time.
  update(dt: number, realDt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.retire(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag) {
        const keep = Math.pow(1 - p.drag, dt); // things that flutter lose speed instead of flying straight
        p.vx *= keep;
        p.vy *= keep;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      this.place(p);
    }

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.life -= dt;
      if (w.life <= 0) {
        this.spareRings[w.big ? 'big' : 'small'].push(w.image.setVisible(false));
        this.waves.splice(i, 1);
        continue;
      }
      const k = 1 - w.life / w.max, // 0 = just born, 1 = gone
        r = w.from + (w.to - w.from) * (1 - Math.pow(1 - k, 3));
      w.image
        .setPosition(w.x, w.y)
        .setScale(w.big ? (unit('fx-ring-big') * r) / BIG_RING_R : (INV * r) / RING_R)
        .setAlpha((1 - k) * (1 - k));
    }

    this.lightA = Math.max(0, this.lightA - realDt * 2.6);
    this.light.setVisible(this.lightA > 0.004).setAlpha(this.lightA);

    this.shakePx = Math.max(0, this.shakePx - realDt * 40);
    this.punchK *= Math.pow(0.0015, realDt);
    const s = this.shakePx;
    // the camera rests on the middle of the world; scroll is in world units
    this.camera
      .setZoom(RES * (1 + this.punchK))
      .setScroll((W - W * RES) / 2 - (s ? rand(-s, s) : 0), (H - H * RES) / 2 - (s ? rand(-s, s) : 0))
      .setRotation(s ? rand(-s, s) * 0.0011 : 0);
  }

  // Each shape lives its life differently: dots shrink away, puffs swell and thin, leaves tumble...
  private place(p: Particle) {
    const k = Math.max(0, p.life / p.max), // 1 = just born, 0 = gone
      age = 1 - k,
      fade = Math.min(1, k * 2.5);
    let sx = p.size,
      sy = p.size,
      rot = 0;
    switch (p.shape) {
      case 'circle':
      case 'soft':
        sx = sy = p.size * k;
        break;
      case 'spark':
        sx = p.size * (0.6 + Math.hypot(p.vx, p.vy) / 260) * k;
        sy = p.size * k;
        rot = Math.atan2(p.vy, p.vx);
        break;
      case 'star':
        sx = sy = p.size * (age < 0.15 ? age / 0.15 : k / 0.85);
        rot = p.rot * 0.2;
        break;
      case 'puff':
        sx = sy = p.size * (0.6 + age * 0.9);
        rot = p.rot;
        break;
      case 'heart':
        sx = sy = p.size * Math.min(1, age * 7) * (0.7 + 0.3 * k);
        rot = Math.sin(p.rot) * 0.3;
        break;
      case 'confetti':
        sx = p.size * Math.cos(p.rot * 1.7); // tumbling: seen edge-on now and then
        rot = p.rot;
        break;
      default: // leaf, petal, clod
        rot = p.rot;
    }
    p.image
      .setPosition(p.x, p.y)
      .setScale((INV * sx) / UNIT || 0.0001, (INV * sy) / UNIT || 0.0001)
      .setRotation(rot)
      .setAlpha(p.alpha * (p.shape === 'puff' ? k : fade));
  }

  private retire(p: Particle) {
    p.image.setVisible(false);
    this.spare.push(p.image);
  }
}
