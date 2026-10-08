// Everything that comes and goes during a fight: seeds and petals, the three hazards, and the dewdrop.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, TAU, W } from '../../config';
import { POLLEN_CLOUD, POLLEN_WARN, ROOT_WARN, VINE_WARN, type Hazard } from '../../sim/hazards';
import type { PollenDrop, RootSpike, VineSweep } from '../../sim/hazards';
import { clamp, lerp } from '../../sim/math';
import type { Dewdrop } from '../../sim/pickups';
import type { Projectile } from '../../sim/projectile';
import { bake, INV, part } from '../art/bake';
import { circle, drawFace, ellipse, fillStroke, heart, sparkle } from '../art/draw';
import { ViewPool, type PooledView } from './pool';

export function bakeEntities(scene: Scene) {
  // ---- projectiles ----
  // Pip's seed: green drop with a leaf tail, pointing right
  bake(scene, 'shot-sprout', 26, 20, 15, 10, (c) => {
    ellipse(c, -7, 0, 6, 3);
    fillStroke(c, '#b6ea7f', null);
    circle(c, 0, 0, 7);
    fillStroke(c, '#8fdc5b', '#4f9d3d', 2.5);
    c.fillStyle = '#fff';
    circle(c, -2, -2.5, 2);
    c.fill();
  });
  // striped sunflower seed
  bake(scene, 'shot-bossSeed', 22, 28, 11, 14, (c) => {
    ellipse(c, 0, 0, 11 * 0.75, 11);
    fillStroke(c, '#6b4a2e', '#3f2a18', 2.5);
    c.strokeStyle = '#e9d8b5';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -8);
    c.lineTo(0, 8);
    c.stroke();
  });
  bake(scene, 'shot-petal', 32, 18, 16, 9, (c) => {
    ellipse(c, 0, 0, 13, 6.5);
    fillStroke(c, '#ffd23f', '#d98f1a', 2.5);
  });

  // ---- shared bits ----
  bake(scene, 'dirt-mound', 96, 52, 48, 26, (c) => {
    ellipse(c, 0, 0, 44, 22);
    fillStroke(c, '#b47a4c', '#7a4e2c', 3);
  });
  bake(scene, 'dirt-clod', 8, 8, 4, 4, (c) => {
    c.fillStyle = '#7a4e2c';
    circle(c, 0, 0, 3);
    c.fill();
  });
  bake(scene, 'warn-mark', 16, 30, 8, 26, (c) => {
    c.fillStyle = '#ff7f50';
    c.font = 'bold 24px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText('!', 0, 0);
  });

  // ---- vine ----
  bake(scene, 'vine-leaf', 34, 30, 17, 15, (c) => {
    ellipse(c, 0, 0, 14, 7, -0.6);
    fillStroke(c, '#7ccf63', '#3f8a33', 2.5);
  });
  bake(scene, 'vine-head', 38, 38, 19, 19, (c) => {
    circle(c, 0, 0, 16);
    fillStroke(c, '#6cc551', '#3f8a33', 3);
    drawFace(c, 0, 0, 0.7, 'angry');
  });

  // ---- root spike, drawn at full height with (0, 0) on the ground line ----
  bake(scene, 'root-spike', 60, 124, 28, 114, (c) => {
    const w = 46,
      h = 96;
    c.beginPath();
    c.moveTo(-w / 2, 4);
    c.quadraticCurveTo(-w * 0.35, -h * 0.6, 0, -h);
    c.quadraticCurveTo(w * 0.35, -h * 0.6, w / 2, 4);
    c.closePath();
    fillStroke(c, '#a9764b', '#6d4a2b', 3);
    c.strokeStyle = 'rgba(109,74,43,0.5)';
    c.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const y = (-h * i) / 4,
        ww = w * (0.5 - i * 0.1);
      c.beginPath();
      c.moveTo(-ww, y);
      c.lineTo(ww, y);
      c.stroke();
    }
    ellipse(c, 8, -h - 6, 9, 5, -0.5);
    fillStroke(c, '#7ccf63', '#3f8a33', 2);
  });
  bake(scene, 'root-mound', 66, 22, 33, 11, (c) => {
    ellipse(c, 0, 0, 30, 8);
    fillStroke(c, '#b47a4c', '#7a4e2c', 2);
  });

  // ---- pollen ----
  bake(scene, 'pollen-mark', 62, 24, 31, 12, (c) => {
    ellipse(c, 0, 0, 28, 9);
    fillStroke(c, '#ffe066', '#e0a800', 2);
  });
  bake(scene, 'pollen-dot', 30, 30, 15, 15, (c) => {
    c.fillStyle = 'rgba(224,168,0,0.35)';
    circle(c, 0, 0, 14);
    c.fill();
  });
  bake(scene, 'pollen-shadow', 44, 16, 22, 8, (c) => {
    c.fillStyle = 'rgba(224,168,0,0.3)';
    ellipse(c, 0, 0, 20, 6);
    c.fill();
  });
  // fuzzy pollen ball
  bake(scene, 'pollen-ball', 34, 34, 17, 17, (c) => {
    const r = 14;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      circle(c, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.6);
      fillStroke(c, '#ffe066', null);
    }
    circle(c, 0, 0, r * 0.7);
    fillStroke(c, '#fff1a8', null);
  });
  bake(scene, 'pollen-puff', 34, 34, 17, 17, (c) => {
    circle(c, 0, 0, 16);
    fillStroke(c, '#ffe066', null);
  });

  // ---- dewdrop ----
  bake(scene, 'dewdrop', 36, 38, 18, 23, (c) => {
    c.beginPath();
    c.moveTo(0, -20);
    c.bezierCurveTo(16, -2, 12, 12, 0, 12);
    c.bezierCurveTo(-12, 12, -16, -2, 0, -20);
    c.closePath();
    fillStroke(c, '#8fd8ff', '#3f9ad6', 2.5);
    c.fillStyle = '#fff';
    ellipse(c, -4, 0, 2.5, 5, 0.3);
    c.fill();
    heart(c, 1, 2, 4);
    c.fillStyle = '#ff7fa0';
    c.fill();
  });
  bake(scene, 'dew-sparkle', 18, 18, 9, 9, (c) => {
    c.fillStyle = '#fff';
    sparkle(c, 0, 0, 8);
    c.fill();
  });
}

// ---------------- projectiles ----------------
const SPIN = { sprout: 0, bossSeed: 6, petal: 5 }; // radians per second

export class ProjectileViews {
  private pool: ViewPool<Projectile, GameObjects.Image>;
  private spin = new WeakMap<Projectile, number>(); // each one starts at its own random angle

  constructor(scene: Scene, depth: number) {
    this.pool = new ViewPool(
      (p) => p.kind,
      (p) => part(scene, `shot-${p.kind}`).setDepth(depth),
    );
  }

  sync(projectiles: readonly Projectile[], alpha: number) {
    this.pool.sync(projectiles, (p, image, fresh) => {
      if (fresh) this.spin.set(p, Math.random() * TAU);
      image.setPosition(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha));
      image.setRotation(
        p.kind === 'sprout' ? Math.atan2(p.vy, p.vx) : this.spin.get(p)! + p.t * SPIN[p.kind],
      );
    });
  }
}

// ---------------- hazards ----------------
interface HazardView extends PooledView {
  sync(h: Hazard, alpha: number): void;
}

// A vine slithers in from the right. Before it moves, a dirt mound rumbles at the edge.
class VineView implements HazardView {
  private body: GameObjects.Graphics;
  private mound: GameObjects.Image;
  private clods: GameObjects.Image[];
  private leaves: GameObjects.Image[];
  private head: GameObjects.Image;
  private all: GameObjects.Container;

  constructor(scene: Scene, depth: number) {
    this.body = scene.add.graphics();
    this.mound = part(scene, 'dirt-mound');
    this.clods = [0, 1, 2, 3].map(() => part(scene, 'dirt-clod'));
    this.leaves = [0, 1, 2].map(() => part(scene, 'vine-leaf'));
    this.head = part(scene, 'vine-head');
    this.all = scene.add
      .container(0, 0, [this.mound, ...this.clods, this.body, ...this.leaves, this.head])
      .setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }
  sync(h: Hazard, alpha: number) {
    const v = h as VineSweep;
    const warning = v.warn > 0;
    this.mound.setVisible(warning);
    for (const c of this.clods) c.setVisible(warning);
    this.body.setVisible(!warning);
    for (const l of this.leaves) l.setVisible(!warning);
    this.head.setVisible(!warning);

    if (warning) {
      const k = 1 - v.warn / VINE_WARN,
        jx = (Math.random() - 0.5) * 3;
      this.mound.setPosition(W - 40 + jx, GROUND + 2).setScale(INV, (INV * (10 + 12 * k)) / 22);
      this.clods.forEach((c, i) =>
        c.setPosition(W - 60 + i * 14 + jx, GROUND - 6 - Math.abs(Math.sin(v.t * 20 + i)) * 12 * k),
      );
      return;
    }
    const y = v.y + v.h / 2,
      x0 = lerp(v.px, v.x, alpha),
      x1 = x0 + v.w;
    this.body.clear();
    for (const [color, width] of [
      [0x3f8a33, v.h - 4],
      [0x6cc551, v.h - 12],
    ]) {
      this.body
        .lineStyle(width, color)
        .beginPath()
        .moveTo(x1 + 60, y + 4);
      for (let x = x1 + 60; x >= x0; x -= 12) this.body.lineTo(x, y + Math.sin(x * 0.07 + v.t * 10) * 4);
      this.body.strokePath();
      this.body.fillStyle(color).fillCircle(x1 + 60, y + 4, width / 2); // rounded tail
    }
    this.leaves.forEach((l, i) => l.setPosition(x0 + 30 + i * 45, y - 20));
    this.head.setPosition(x0 - 6, y - 4);
  }
}

// A root bursts up at a marked spot. The "!" mark and a twitching mound come first.
class RootView implements HazardView {
  private spike: GameObjects.Image;
  private mound: GameObjects.Image;
  private warnMound: GameObjects.Image;
  private mark: GameObjects.Image;
  private all: GameObjects.Container;

  constructor(scene: Scene, depth: number) {
    this.warnMound = part(scene, 'root-mound');
    this.mark = part(scene, 'warn-mark');
    this.spike = part(scene, 'root-spike');
    this.mound = part(scene, 'root-mound');
    this.all = scene.add.container(0, 0, [this.warnMound, this.mark, this.spike, this.mound]).setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }
  sync(h: Hazard) {
    const r = h as RootSpike;
    const warning = r.phase === 'warn';
    this.warnMound.setVisible(warning);
    this.mark.setVisible(warning);
    this.spike.setVisible(!warning);
    this.mound.setVisible(!warning);
    if (warning) {
      const k = 1 - r.warn / ROOT_WARN,
        j = (Math.random() - 0.5) * 4 * k;
      const rx = 26 * (0.5 + 0.5 * Math.abs(Math.sin(r.t * 10)));
      this.warnMound.setPosition(r.x + j, GROUND + 2).setScale((INV * rx) / 30, (INV * 7) / 8);
      this.mark.setPosition(r.x, GROUND - 16 - Math.abs(Math.sin(r.t * 8)) * 6);
      return;
    }
    this.spike.setPosition(r.x, GROUND).setScale(INV, INV * r.up); // grows out of the ground line
    this.mound.setPosition(r.x, GROUND + 2);
  }
}

// Pollen falls onto a shadowed spot, then leaves a cloud for half a second.
class PollenView implements HazardView {
  private mark: GameObjects.Image;
  private dot: GameObjects.Image;
  private shadow: GameObjects.Image;
  private ball: GameObjects.Image;
  private puffs: GameObjects.Image[];
  private all: GameObjects.Container;

  constructor(scene: Scene, depth: number) {
    this.mark = part(scene, 'pollen-mark');
    this.dot = part(scene, 'pollen-dot');
    this.shadow = part(scene, 'pollen-shadow');
    this.ball = part(scene, 'pollen-ball');
    this.puffs = [0, 1, 2, 3].map(() => part(scene, 'pollen-puff'));
    this.all = scene.add
      .container(0, 0, [this.mark, this.dot, this.shadow, this.ball, ...this.puffs])
      .setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }
  sync(h: Hazard, alpha: number) {
    const d = h as PollenDrop;
    const x = d.x,
      warning = d.phase === 'warn' && d.warn <= POLLEN_WARN, // each ball in a volley waits its turn first
      falling = d.phase === 'fall',
      cloud = d.phase === 'cloud';
    this.mark.setVisible(warning);
    this.dot.setVisible(warning);
    this.shadow.setVisible(falling);
    this.ball.setVisible(falling);
    for (const p of this.puffs) p.setVisible(cloud);

    if (warning) {
      const k = clamp(1 - d.warn / POLLEN_WARN, 0, 1);
      this.mark.setPosition(x, GROUND + 1).setAlpha(0.35 + 0.35 * Math.sin(d.t * 12) ** 2);
      this.dot.setPosition(x, GROUND - 8).setScale((INV * (4 + 10 * k)) / 14);
    } else if (falling) {
      this.shadow.setPosition(x, GROUND + 1);
      this.ball.setPosition(x, lerp(d.py, d.y, alpha)).setRotation(d.t * 3);
    } else if (cloud) {
      const k = d.cloud / POLLEN_CLOUD;
      this.puffs.forEach((p, i) =>
        p
          .setPosition(
            x + Math.cos(i * 1.57) * 18 * (1.4 - k),
            GROUND - 14 - Math.abs(Math.sin(i * 1.57)) * 8 * (1.4 - k),
          )
          .setScale(INV * (0.6 + 0.4 * k))
          .setAlpha(k * 0.8),
      );
    }
  }
}

export class HazardViews {
  private pool: ViewPool<Hazard, HazardView>;

  constructor(scene: Scene, depth: number) {
    this.pool = new ViewPool<Hazard, HazardView>(
      (h) => h.kind,
      (h) =>
        h.kind === 'vine'
          ? new VineView(scene, depth)
          : h.kind === 'root'
            ? new RootView(scene, depth)
            : new PollenView(scene, depth),
    );
  }
  sync(hazards: readonly Hazard[], alpha: number) {
    this.pool.sync(hazards, (h, view) => view.sync(h, alpha));
  }
}

// ---------------- dewdrop ----------------
class DewdropView implements PooledView {
  private drop: GameObjects.Image;
  private sparkle: GameObjects.Image;
  constructor(scene: Scene, depth: number) {
    this.drop = part(scene, 'dewdrop').setDepth(depth);
    this.sparkle = part(scene, 'dew-sparkle').setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.drop.setVisible(visible);
    this.sparkle.setVisible(visible);
  }
  sync(d: Dewdrop, alpha: number) {
    this.setVisible(!(d.life < 3 && Math.floor(d.life * 8) % 2 === 0)); // blink before vanishing
    const x = d.x,
      y = lerp(d.py, d.y, alpha) + Math.sin(d.t * 4) * 3;
    this.drop.setPosition(x, y);
    this.sparkle.setPosition(x + 12, y - 16).setScale((INV * (5 + Math.sin(d.t * 6) * 2)) / 8);
  }
}

export class PickupViews {
  private pool: ViewPool<Dewdrop, DewdropView>;
  constructor(scene: Scene, depth: number) {
    this.pool = new ViewPool(
      () => 'dewdrop',
      () => new DewdropView(scene, depth),
    );
  }
  sync(pickups: readonly Dewdrop[], alpha: number) {
    this.pool.sync(pickups, (d, view) => view.sync(d, alpha));
  }
}
