// Things that fly: Pip's seeds, and the seeds and petals Sunny throws back.
// Pip's seeds glow and leave a streak. Sunny's carry a pale halo, so they stand out against any sky.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { TAU } from '../../config';
import { lerp } from '../../sim/math';
import type { Projectile, ProjectileKind } from '../../sim/projectile';
import { bake, part, SOFT } from '../art/bake';
import { PIP_LINE } from '../art/color';
import { circle, glow, inside, leaf, line, linear, radial, type Ctx } from '../art/draw';
import { ViewPool, type PooledView } from './pool';

const SPIN = { sprout: 0, bossSeed: 6, petal: 5 }; // radians per second
// Pip's seed is born at Pip's middle. It stays hidden for a moment, so it appears at the blaster's mouth.
const MUZZLE_TIME = 0.03;

export function bakeProjectiles(scene: Scene) {
  // Pip's seed, flying to the right
  bake(scene, 'shot-sprout', 30, 20, 17, 10, (c) => {
    const shape = () => {
      c.beginPath();
      c.moveTo(-13, 0);
      c.quadraticCurveTo(-4, -8.5, 3, -6.6);
      c.arc(1, 0, 6.8, -1.25, 1.25);
      c.quadraticCurveTo(-4, 8.5, -13, 0);
      c.closePath();
    };
    shape();
    c.fillStyle = radial(c, 0, 0, 12, ['#ffffff', '#dcff8e', '#86dc44'], 2, -2);
    c.fill();
    line(c, PIP_LINE, 2.4);
    circle(c, 2.5, -2.6, 1.9);
    c.fillStyle = '#fff';
    c.fill();
  });
  // the streak behind it; (0, 0) is the seed
  bake(
    scene,
    'shot-trail',
    60,
    18,
    56,
    9,
    (c) => {
      c.fillStyle = linear(c, -54, 0, 2, 0, ['rgba(190,255,120,0)', 'rgba(214,255,150,0.75)']);
      c.beginPath();
      c.moveTo(2, -6);
      c.quadraticCurveTo(-26, -3, -54, 0);
      c.quadraticCurveTo(-26, 3, 2, 6);
      c.closePath();
      c.fill();
      glow(c, 0, 0, 9, '#eaffb0', 0.8);
    },
    SOFT,
  );
  // pale light behind Sunny's shots
  bake(scene, 'shot-halo', 56, 56, 28, 28, (c) => glow(c, 0, 0, 27, '#ffffff', 0.75), SOFT);

  // striped sunflower seed
  bake(scene, 'shot-bossSeed', 26, 34, 13, 17, (c: Ctx) => {
    const shape = () => leaf(c, 0, 14, 28, 11, -Math.PI / 2, 0.42, 0.7);
    shape();
    c.fillStyle = linear(c, -9, 0, 9, 0, ['#8a623c', '#4a2f1a']);
    c.fill();
    inside(c, shape, () => {
      for (const x of [-4.5, 0, 4.5]) {
        c.beginPath();
        c.moveTo(x, -12);
        c.quadraticCurveTo(x * 1.5, 0, x, 12);
        line(c, '#f4e6c8', 2);
      }
      glow(c, -4, -5, 7, '#ffffff', 0.35);
    });
    shape();
    line(c, '#24150a', 2.6);
  });
  bake(scene, 'shot-petal', 36, 22, 18, 11, (c) => {
    const shape = () => leaf(c, -15, 0, 30, 9.5, 0, 0.5, 0.7);
    shape();
    c.fillStyle = linear(c, -15, 0, 15, 0, ['#ff9a1f', '#ffd23f', '#fff0a0']);
    c.fill();
    inside(c, shape, () => {
      glow(c, 4, -4, 12, '#ffffff', 0.5, 4);
      c.beginPath();
      c.moveTo(-10, 0);
      c.lineTo(11, 0);
      line(c, '#c9730f', 1.4, 0.5);
    });
    shape();
    line(c, '#a3520a', 2.6);
  });
}

class ShotView implements PooledView {
  private under: GameObjects.Image; // the streak or the halo
  private body: GameObjects.Image;
  private turn = Math.random() * TAU; // each one starts at its own angle

  constructor(scene: Scene, kind: ProjectileKind, depth: number) {
    // Halos, streaks and the shots themselves each get a layer of their own, a hair apart. Sprites that
    // glow cannot be drawn in the same go as ones that don't, so interleaving them (halo, shot, streak,
    // shot...) would cost a separate draw for every one; in layers, each kind is drawn together.
    this.under =
      kind === 'sprout'
        ? part(scene, 'shot-trail')
            .setBlendMode(BlendModes.ADD)
            .setDepth(depth - 0.01)
        : part(scene, 'shot-halo')
            .setTint(kind === 'petal' ? 0xfff3b0 : 0xffe9c8)
            .setDepth(depth - 0.02);
    this.body = part(scene, `shot-${kind}`).setDepth(depth);
  }

  setVisible(visible: boolean) {
    this.under.setVisible(visible);
    this.body.setVisible(visible);
  }

  sync(p: Projectile, alpha: number) {
    const x = lerp(p.px, p.x, alpha),
      y = lerp(p.py, p.y, alpha);
    this.body.setPosition(x, y);
    this.under.setPosition(x, y);
    if (p.kind === 'sprout') {
      const heading = Math.atan2(p.vy, p.vx),
        out = p.t >= MUZZLE_TIME;
      this.body.setRotation(heading).setVisible(out);
      // the streak grows out behind the seed over its first moments
      this.under
        .setRotation(heading)
        .setScale(Math.min(1, p.t / 0.12), 1)
        .setVisible(out);
    } else {
      this.body.setRotation(this.turn + p.t * SPIN[p.kind]);
      this.under.setScale(1 + Math.sin(p.t * 12) * 0.08).setAlpha(0.8);
    }
  }
}

export class ProjectileViews {
  private pool: ViewPool<Projectile, ShotView>;

  constructor(scene: Scene, depth: number) {
    this.pool = new ViewPool(
      (p) => p.kind,
      (p) => new ShotView(scene, p.kind, depth),
    );
  }

  sync(projectiles: readonly Projectile[], alpha: number) {
    this.pool.sync(projectiles, (p, view) => view.sync(p, alpha));
  }
}
