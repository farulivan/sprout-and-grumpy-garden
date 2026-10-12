// The dewdrop that heals a heart. It glows, twinkles and sends out little rings of light, so that in the
// middle of a fight the one helpful thing on screen is easy to spot.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import { clamp, lerp } from '../../sim/math';
import type { Dewdrop } from '../../sim/pickups';
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
