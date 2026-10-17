// The dewdrop that heals a heart. It glows, twinkles and sends out little rings of light, so that in the
// middle of a fight the one helpful thing on screen is easy to spot. A stage also places dewdrops of its own,
// floating where they were put, and golden seeds, which glitter gold.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import { clamp, lerp } from '../../sim/math';
import type { Dewdrop, Placed } from '../../sim/pickups';
import { bake, INV, part, SOFT } from '../art/bake';
import { circle, ellipse, glow, heart, inside, line, radial, sparkle } from '../art/draw';
import type { FxTarget } from '../presenter';
import { ViewPool, type PooledView } from './pool';

export function bakePickups(scene: Scene) {
  bake(scene, 'dewdrop', 40, 46, 20, 27, (c) => {
    const shape = () => {
      c.beginPath();
      c.moveTo(0, -23);
      c.bezierCurveTo(18, -3, 15, 15, 0, 15);
      c.bezierCurveTo(-15, 15, -18, -3, 0, -23);
      c.closePath();
    };
    shape();
    c.fillStyle = radial(c, 0, 2, 22, ['#f2fdff', '#9fe0ff', '#3f9fe6'], -5, -3);
    c.fill();
    inside(c, shape, () => {
      // light pooling at the bottom, the way it does in a real drop
      glow(c, 3, 12, 12, '#e6fbff', 0.7, 5);
      heart(c, 0.5, 2, 5.2);
      c.fillStyle = '#ff7fa0';
      c.fill();
      line(c, '#d94f78', 1.2, 0.7);
    });
    shape();
    line(c, '#1f6fb3', 2.6);
    ellipse(c, -5.5, -3, 2.4, 5.2, 0.35);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fill();
    circle(c, -3, 6, 1.4);
    c.fill();
  });
  bake(scene, 'dew-glow', 96, 96, 48, 48, (c) => glow(c, 0, 0, 47, '#9fe6ff', 0.85), SOFT);
  bake(scene, 'dew-sparkle', 22, 22, 11, 11, (c) => {
    glow(c, 0, 0, 10, '#ffffff', 0.6);
    sparkle(c, 0, 0, 10);
    c.fillStyle = '#fff';
    c.fill();
  });
  bake(scene, 'dew-shadow', 44, 14, 22, 7, (c) => glow(c, 0, 0, 21, '#14301a', 0.42, 6), SOFT);

  // a golden sunflower seed, striped, with a shine on it
  bake(scene, 'golden-seed', 30, 40, 15, 20, (c) => {
    const shape = () => {
      c.beginPath();
      c.moveTo(0, -17);
      c.bezierCurveTo(11, -10, 11, 8, 0, 16);
      c.bezierCurveTo(-11, 8, -11, -10, 0, -17);
      c.closePath();
    };
    shape();
    c.fillStyle = radial(c, -3, -5, 18, ['#fff8c8', '#ffd23f', '#e09a14'], -4, -7);
    c.fill();
    inside(c, shape, () => {
      for (const x of [-4.5, 0, 4.5]) {
        c.beginPath();
        c.moveTo(x, -14);
        c.quadraticCurveTo(x * 1.5, 0, x, 14);
        line(c, '#fff3c0', 2, 0.8);
      }
      glow(c, -4, -7, 7, '#ffffff', 0.7);
    });
    shape();
    line(c, '#8a5200', 2.6);
  });
  bake(scene, 'seed-glow', 96, 96, 48, 48, (c) => glow(c, 0, 0, 47, '#ffe066', 0.8), SOFT);
}

class DewdropView implements PooledView {
  private shadow: GameObjects.Image;
  private glow: GameObjects.Image;
  private drop: GameObjects.Image;
  private sparkles: GameObjects.Image[];
  private parts: GameObjects.Image[];
  private pingT = 0;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
  ) {
    // the glow is light, so it goes on a layer of its own just under the drop (see ProjectileViews)
    this.glow = part(scene, 'dew-glow')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.shadow = part(scene, 'dew-shadow').setDepth(depth);
    this.drop = part(scene, 'dewdrop').setDepth(depth);
    this.sparkles = [0, 1].map(() => part(scene, 'dew-sparkle').setDepth(depth));
    this.parts = [this.glow, this.shadow, this.drop, ...this.sparkles];
  }
  setVisible(visible: boolean) {
    for (const img of this.parts) img.setVisible(visible);
  }
  sync(d: Dewdrop, alpha: number, dt: number) {
    this.setVisible(!(d.life < 3 && Math.floor(d.life * 8) % 2 === 0)); // blink before vanishing
    const x = d.x,
      y = lerp(d.py, d.y, alpha) + Math.sin(d.t * 4) * 3,
      landed = d.vy === 0;
    // the shadow gathers under it as it nears the ground
    const near = clamp(1 - (GROUND - 14 - d.y) / 220, 0, 1);
    this.shadow
      .setPosition(x, GROUND + 3)
      .setAlpha(near)
      .setScale(0.6 + 0.4 * near);
    this.glow
      .setPosition(x, y - 2)
      .setScale(0.85 + Math.sin(d.t * 5) * 0.12)
      .setAlpha(0.75);
    // stretched a little while it falls, round once it rests
    this.drop.setPosition(x, y).setScale(INV * (landed ? 1 : 0.92), INV * (landed ? 1 : 1.1));
    this.sparkles.forEach((s, i) => {
      const a = d.t * 2.4 + i * Math.PI;
      s.setPosition(x + Math.cos(a) * 17, y - 4 + Math.sin(a) * 13)
        .setScale(INV * (0.55 + 0.35 * Math.sin(d.t * 7 + i * 2)))
        .setRotation(d.t * 2);
    });
    this.pingT -= dt;
    if (this.pingT <= 0) {
      this.pingT = 0.9;
      this.fx.ring(x, y - 2, { color: '#bfeaff', from: 12, to: 40, life: 0.65 });
    }
  }
}

// A dewdrop placed along a stage: the same drop, bobbing where it was put.
class PlacedDewView implements PooledView {
  private glow: GameObjects.Image;
  private drop: GameObjects.Image;
  private sparkles: GameObjects.Image[];
  private parts: GameObjects.Image[];
  private t = Math.random() * 6;
  private pingT = 0;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
  ) {
    this.glow = part(scene, 'dew-glow')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.drop = part(scene, 'dewdrop').setDepth(depth);
    this.sparkles = [0, 1].map(() => part(scene, 'dew-sparkle').setDepth(depth));
    this.parts = [this.glow, this.drop, ...this.sparkles];
  }
  setVisible(visible: boolean) {
    for (const img of this.parts) img.setVisible(visible);
  }
  sync(d: Placed, dt: number) {
    const t = (this.t += dt),
      x = d.x,
      y = d.y + Math.sin(t * 3) * 4;
    this.glow
      .setPosition(x, y - 2)
      .setScale(0.85 + Math.sin(t * 5) * 0.12)
      .setAlpha(0.75);
    this.drop.setPosition(x, y);
    this.sparkles.forEach((s, i) => {
      const a = t * 2.4 + i * Math.PI;
      s.setPosition(x + Math.cos(a) * 17, y - 4 + Math.sin(a) * 13)
        .setScale(INV * (0.55 + 0.35 * Math.sin(t * 7 + i * 2)))
        .setRotation(t * 2);
    });
    this.pingT -= dt;
    if (this.pingT <= 0) {
      this.pingT = 1.1;
      this.fx.ring(x, y - 2, { color: '#bfeaff', from: 12, to: 40, life: 0.65 });
    }
  }
}

// A golden seed: it turns slowly, glitters, and glows warm.
class SeedView implements PooledView {
  private glow: GameObjects.Image;
  private seed: GameObjects.Image;
  private sparkles: GameObjects.Image[];
  private parts: GameObjects.Image[];
  private t = Math.random() * 6;

  constructor(scene: Scene, depth: number) {
    this.glow = part(scene, 'seed-glow')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.seed = part(scene, 'golden-seed').setDepth(depth);
    this.sparkles = [0, 1, 2].map(() => part(scene, 'dew-sparkle').setDepth(depth).setTint(0xfff1a0));
    this.parts = [this.glow, this.seed, ...this.sparkles];
  }
  setVisible(visible: boolean) {
    for (const img of this.parts) img.setVisible(visible);
  }
  sync(d: Placed, dt: number) {
    const t = (this.t += dt),
      x = d.x,
      y = d.y + Math.sin(t * 2.6) * 4;
    this.glow
      .setPosition(x, y)
      .setScale(0.7 + Math.sin(t * 4) * 0.1)
      .setAlpha(0.7);
    // turning on the spot: narrow when side-on
    this.seed.setPosition(x, y).setScale(INV * (0.45 + 0.55 * Math.abs(Math.cos(t * 1.8))), INV);
    this.sparkles.forEach((s, i) => {
      const a = t * 1.9 + (i * Math.PI * 2) / 3;
      s.setPosition(x + Math.cos(a) * 19, y + Math.sin(a) * 15)
        .setScale(INV * (0.4 + 0.35 * Math.max(0, Math.sin(t * 6 + i * 2))))
        .setRotation(t * 2.5);
    });
  }
}

// What a stage has placed: dewdrops and golden seeds.
export class StagePickupViews {
  private pool: ViewPool<Placed, PlacedDewView | SeedView>;
  constructor(scene: Scene, depth: number, fx: FxTarget) {
    this.pool = new ViewPool(
      (d) => d.kind,
      (d) => (d.kind === 'seed' ? new SeedView(scene, depth) : new PlacedDewView(scene, depth, fx)),
    );
  }
  sync(pickups: readonly Placed[], dt: number) {
    this.pool.sync(pickups, (d, view) => view.sync(d, dt));
  }
}

export class PickupViews {
  private pool: ViewPool<Dewdrop, DewdropView>;
  constructor(scene: Scene, depth: number, fx: FxTarget) {
    this.pool = new ViewPool(
      () => 'dewdrop',
      () => new DewdropView(scene, depth, fx),
    );
  }
  sync(pickups: readonly Dewdrop[], alpha: number, dt: number) {
    this.pool.sync(pickups, (d, view) => view.sync(d, alpha, dt));
  }
}
