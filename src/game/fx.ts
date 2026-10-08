// Particles and screen shake. Particles are pooled images: every shape is baked in white and tinted,
// so one texture serves every colour.
import type { Cameras, GameObjects, Scene } from 'phaser';
import { H, RES, TAU, W } from '../config';
import type { Burst, ParticleShape } from '../presentation';
import { bake, hex, INV, part } from './art/bake';
import { circle, ellipse, heart, sparkle } from './art/draw';

const UNIT = 8; // the size every shape is baked at
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function bakeFx(scene: Scene) {
  const white = (draw: (c: CanvasRenderingContext2D) => void) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = '#fff';
    draw(c);
    c.fill();
  };
  bake(
    scene,
    'fx-circle',
    18,
    18,
    9,
    9,
    white((c) => circle(c, 0, 0, UNIT)),
  );
  bake(
    scene,
    'fx-leaf',
    28,
    16,
    14,
    8,
    white((c) => ellipse(c, 0, 0, UNIT * 1.6, UNIT * 0.8)),
  );
  bake(
    scene,
    'fx-heart',
    28,
    20,
    14,
    11,
    white((c) => heart(c, 0, 0, UNIT)),
  );
  bake(
    scene,
    'fx-star',
    18,
    18,
    9,
    9,
    white((c) => sparkle(c, 0, 0, UNIT)),
  );
}

interface Particle {
  image: GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  gravity: number;
  shape: ParticleShape;
  rot: number;
  vr: number;
}

export class Fx {
  private particles: Particle[] = [];
  private spare: GameObjects.Image[] = [];
  private shakePx = 0;
  private camera: Cameras.Scene2D.Camera;

  constructor(
    private scene: Scene,
    private depth: number,
  ) {
    this.camera = scene.cameras.main;
  }

  burst(x: number, y: number, b: Burst) {
    const { n = 8, color = '#fff', colors, speed = 120, size = 4, life = 0.5, gravity = 300 } = b;
    const { shape = 'circle', spread = TAU, dir = 0 } = b;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread,
        s = speed * rand(0.4, 1);
      const image = (this.spare.pop() ?? part(this.scene, 'fx-circle').setDepth(this.depth))
        .setTexture(`fx-${shape}`)
        .setTint(hex(colors ? colors[i % colors.length] : color))
        .setVisible(true);
      this.particles.push({
        image,
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        size: size * rand(0.6, 1.3),
        gravity,
        shape,
        rot: rand(0, TAU),
        vr: rand(-6, 6),
      });
    }
  }

  // px = how far the picture may jump; it settles by itself.
  shake(px: number) {
    this.shakePx = px;
  }

  // A new fight starts clean.
  clear() {
    for (const p of this.particles) this.retire(p);
    this.particles.length = 0;
    this.shakePx = 0;
  }

  // dt drives the particles (slowed during the win slow-motion); shakeDt settles the shake in real time.
  update(dt: number, shakeDt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.retire(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.shape === 'leaf') {
        const drag = Math.pow(0.985, dt * 60); // leaves flutter instead of flying straight
        p.vx *= drag;
        p.vy *= drag;
      }
      const k = p.life / p.max; // 1 = just born, 0 = gone
      const scale = p.shape === 'leaf' ? p.size : p.shape === 'star' ? p.size * (0.5 + k) : p.size * k;
      p.image
        .setPosition(p.x, p.y)
        .setScale((INV * scale) / UNIT)
        .setRotation(p.shape === 'leaf' ? p.rot : 0)
        .setAlpha(Math.min(1, k * 2));
    }

    this.shakePx = Math.max(0, this.shakePx - shakeDt * 40);
    const s = this.shakePx;
    // the camera rests on the middle of the world; scroll is in world units
    this.camera.setScroll(
      (W - W * RES) / 2 - (s ? rand(-s, s) : 0),
      (H - H * RES) / 2 - (s ? rand(-s, s) : 0),
    );
  }

  private retire(p: Particle) {
    p.image.setVisible(false);
    this.spare.push(p.image);
  }
}
