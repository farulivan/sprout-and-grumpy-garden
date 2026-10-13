// The three ways the garden itself attacks: a vine sliding along the ground, roots bursting up from below,
// and pollen dropping out of the sky. Each one shows where it will strike before it can hurt, and the
// warnings all speak the same language: an orange "!" badge, or an orange ring on the ground.
// Their parts are baked in hazards/art.ts; this file moves them.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, TAU, UP, W } from '../../config';
import { POLLEN_CLOUD, POLLEN_WARN, ROOT_WARN, VINE_WARN, type Hazard } from '../../sim/hazards';
import type { PollenDrop, RootSpike, VineSweep } from '../../sim/hazards';
import { clamp, lerp } from '../../sim/math';
import { DUST, type Burst } from '../../presentation';
import { INV, part, Ribbon } from '../art/bake';
import { easeOutBack, rand } from '../motion';
import type { FxTarget } from '../presenter';
import { bakeHazards, VINE_LEN, VINE_POINTS } from './hazards/art';
import { ViewPool, type PooledView } from './pool';

export { bakeHazards };

const POLLEN_FALL = (GROUND - 14 + 30) / 520; // seconds a pollen ball takes to reach the ground
const DUST_PUFF: Burst = { ...DUST, n: 1 };
const DUST_KICKED: Burst = { ...DUST, n: 1, dir: UP - 0.6 }; // thrown back by something sliding left
const DUST_BURST: Burst = { ...DUST, n: 5, speed: 110 };
const CLODS: Burst = {
  n: 8,
  shape: 'clod',
  colors: ['#8a5530', '#b47a4c', '#6a3f22'],
  speed: 260,
  size: 4,
  life: 0.7,
  gravity: 700,
  dir: UP,
  spread: 1.5,
};

// The "!" badge pops in, then bounces. Every badge is drawn on the marks layer, in front of Pip, so a
// warning can never hide behind the hero.
function showMark(mark: GameObjects.Image, x: number, y: number, t: number) {
  mark
    .setVisible(true)
    .setPosition(x, y - Math.abs(Math.sin(t * 8.5)) * 7)
    .setScale(INV * 1.3 * easeOutBack(Math.min(1, t / 0.18)));
}

interface HazardView extends PooledView {
  // fresh = the first frame this view shows this hazard.
  sync(h: Hazard, alpha: number, dt: number, fresh: boolean): void;
}

// A vine slithers in from the right. Before it moves, a mound of earth rumbles at the edge.
class VineView implements HazardView {
  private body: Ribbon;
  private mound: GameObjects.Image;
  private mark: GameObjects.Image;
  private clods: GameObjects.Image[];
  private thorns: GameObjects.Image[];
  private leaves: GameObjects.Image[];
  private head: GameObjects.Image;
  private rumbling: GameObjects.Image[]; // shown during the warning
  private sliding: { setVisible(visible: boolean): unknown }[]; // shown once it moves
  private all: GameObjects.Container;
  private dustT = 0;

  constructor(
    scene: Scene,
    depth: number,
    markDepth: number,
    private fx: FxTarget,
  ) {
    this.body = new Ribbon(scene, 'vine-body', VINE_POINTS);
    this.mound = part(scene, 'dirt-mound');
    this.mark = part(scene, 'warn-mark').setDepth(markDepth);
    this.clods = [0, 1, 2, 3].map(() => part(scene, 'dirt-clod'));
    this.thorns = [0, 1, 2, 3, 4].map(() => part(scene, 'vine-thorn'));
    this.leaves = [0, 1, 2].map(() => part(scene, 'vine-leaf'));
    this.head = part(scene, 'vine-head');
    this.rumbling = [this.mound, ...this.clods];
    this.sliding = [...this.thorns, this.body.rope, ...this.leaves, this.head];
    // thorns go under the body so their feet are hidden; leaves and the head sit on top of it
    this.all = scene.add
      .container(0, 0, [this.mound, ...this.clods, ...this.thorns, this.body.rope, ...this.leaves, this.head])
      .setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
    if (!visible) this.mark.setVisible(false);
  }
  sync(h: Hazard, alpha: number, dt: number) {
    const v = h as VineSweep;
    const warning = v.warn > 0;
    for (const img of this.rumbling) img.setVisible(warning);
    for (const piece of this.sliding) piece.setVisible(!warning);
    this.mark.setVisible(warning);
    this.dustT -= dt;

    if (warning) {
      const k = 1 - v.warn / VINE_WARN,
        jx = rand(-1.5, 1.5);
      this.mound.setPosition(W - 46 + jx, GROUND + 3).setScale(INV, INV * (0.4 + 0.6 * k));
      showMark(this.mark, W - 46, GROUND - 46, v.t);
      for (let i = 0; i < this.clods.length; i++)
        this.clods[i].setPosition(
          W - 74 + i * 18 + jx,
          GROUND - 8 - Math.abs(Math.sin(v.t * 20 + i * 1.7)) * 16 * k,
        );
      if (this.dustT <= 0) {
        this.dustT = 0.1;
        this.fx.burst(W - 46 + rand(-30, 30), GROUND, DUST_PUFF);
      }
      return;
    }

    const mid = v.y + v.h / 2,
      x0 = lerp(v.px, v.x, alpha),
      ripple = v.t * 10;
    for (let i = 0; i < VINE_POINTS; i++) {
      const x = x0 + (VINE_LEN * i) / (VINE_POINTS - 1);
      this.body.set(i, x, mid + Math.sin(x * 0.07 + ripple) * 4);
    }
    this.body.bend();
    for (let i = 0; i < this.thorns.length; i++) {
      const x = x0 + 36 + i * 31;
      this.thorns[i]
        .setPosition(x, mid + Math.sin(x * 0.07 + ripple) * 4 - 12)
        .setRotation(Math.cos(x * 0.07 + ripple) * 0.25);
    }
    for (let i = 0; i < this.leaves.length; i++) {
      const x = x0 + 52 + i * 46;
      this.leaves[i]
        .setPosition(x, mid + Math.sin(x * 0.07 + ripple) * 4 - 10)
        .setRotation(-0.9 + Math.sin(v.t * 9 + i * 2) * 0.25);
    }
    this.head
      .setPosition(x0 - 6, mid + Math.sin(x0 * 0.07 + ripple) * 4 - 5)
      .setRotation(Math.sin(ripple) * 0.08);
    if (this.dustT <= 0) {
      this.dustT = 0.07;
      this.fx.burst(x0 - 16, GROUND, DUST_KICKED);
    }
  }
}

// A root bursts up at a marked spot. The ground cracks and a "!" bounces over it first.
class RootView implements HazardView {
  private crack: GameObjects.Image;
  private mark: GameObjects.Image;
  private spike: GameObjects.Image;
  private mound: GameObjects.Image;
  private all: GameObjects.Container;
  private out = false;

  constructor(
    scene: Scene,
    depth: number,
    markDepth: number,
    private fx: FxTarget,
  ) {
    this.crack = part(scene, 'root-crack');
    this.mark = part(scene, 'warn-mark').setDepth(markDepth);
    this.spike = part(scene, 'root-spike');
    this.mound = part(scene, 'root-mound');
    this.all = scene.add.container(0, 0, [this.crack, this.spike, this.mound]).setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
    if (!visible) this.mark.setVisible(false);
  }
  sync(h: Hazard, _alpha: number, _dt: number, fresh: boolean) {
    const r = h as RootSpike;
    if (fresh) this.out = false;
    const warning = r.phase === 'warn';
    this.crack.setVisible(warning);
    this.mark.setVisible(warning);
    this.spike.setVisible(!warning);
    this.mound.setVisible(!warning);
    if (warning) {
      const k = 1 - r.warn / ROOT_WARN;
      this.crack
        .setPosition(r.x + rand(-2, 2) * k, GROUND + 3)
        .setScale(INV * (0.45 + 0.75 * k), INV * (0.8 + 0.4 * k));
      showMark(this.mark, r.x, GROUND - 34, r.t);
      return;
    }
    if (!this.out) {
      this.out = true; // it has just broken through
      this.fx.burst(r.x, GROUND, CLODS);
      this.fx.burst(r.x, GROUND, DUST_BURST);
      this.fx.ring(r.x, GROUND - 6, { color: '#f0d9b0', from: 10, to: 54, life: 0.3 });
      this.fx.shake(3);
    }
    // it shoots out thin and settles to its full width, shivering while it stands
    const shiver = r.phase === 'hold' ? Math.sin(r.t * 34) * 0.02 : 0;
    this.spike.setPosition(r.x, GROUND + 2).setScale(INV * (1.25 - 0.25 * r.up + shiver), INV * r.up);
    this.mound.setPosition(r.x, GROUND + 4);
  }
}

// Pollen falls onto a ringed spot, then leaves a cloud that stings for half a second.
class PollenView implements HazardView {
  private target: GameObjects.Image;
  private beam: GameObjects.Image;
  private glow: GameObjects.Image;
  private ball: GameObjects.Image;
  private puffs: GameObjects.Image[];
  private all: GameObjects.Container;
  private landed = false;
  private sparkT = 0;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
  ) {
    // The beam and the glow are light: they sit on a layer of their own just under the rest, so the
    // light of every pollen ball on screen is drawn in one go (see ProjectileViews).
    this.beam = part(scene, 'pollen-beam')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.glow = part(scene, 'pollen-glow')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.target = part(scene, 'pollen-target');
    this.ball = part(scene, 'pollen-ball');
    this.puffs = [0, 1, 2, 3, 4].map(() => part(scene, 'pollen-puff'));
    this.all = scene.add.container(0, 0, [this.target, this.ball, ...this.puffs]).setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.all.setVisible(visible);
    if (!visible) {
      this.beam.setVisible(false);
      this.glow.setVisible(false);
    }
  }
  sync(h: Hazard, alpha: number, dt: number, fresh: boolean) {
    const d = h as PollenDrop;
    if (fresh) this.landed = false;
    const x = d.x,
      warning = d.phase === 'warn' && d.warn <= POLLEN_WARN, // each ball in a volley waits its turn first
      falling = d.phase === 'fall',
      cloud = d.phase === 'cloud';
    this.target.setVisible(warning || falling);
    this.beam.setVisible(warning || falling);
    this.glow.setVisible(falling);
    this.ball.setVisible(falling);
    for (const p of this.puffs) p.setVisible(cloud);

    if (warning || falling) {
      // 0 -> 1 from the moment the ring appears until the ball lands on it
      const since = warning ? POLLEN_WARN - d.warn : POLLEN_WARN + (d.y + 30) / 520,
        k = clamp(since / (POLLEN_WARN + POLLEN_FALL), 0, 1),
        pulse = Math.sin(d.t * (8 + k * 10)) ** 2;
      this.target
        .setPosition(x, GROUND + 2)
        .setScale(INV * (1.55 - 0.55 * k))
        .setAlpha(0.6 + 0.4 * pulse);
      this.beam.setPosition(x, GROUND).setAlpha(0.2 + 0.35 * k);
    }
    if (falling) {
      const y = lerp(d.py, d.y, alpha);
      this.ball.setPosition(x, y).setRotation(d.t * 3);
      this.glow.setPosition(x, y).setScale(1 + Math.sin(d.t * 14) * 0.1);
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.05;
        this.fx.burst(x + rand(-8, 8), y - 12, {
          n: 1,
          shape: 'star',
          color: '#fff3a0',
          speed: 24,
          gravity: 0,
          life: 0.35,
          size: 4.5,
          glow: true,
        });
      }
    } else if (cloud) {
      if (!this.landed) {
        this.landed = true;
        this.fx.ring(x, GROUND - 8, { color: '#ffe680', from: 8, to: 46, life: 0.3 });
        this.fx.burst(x, GROUND - 10, {
          n: 7,
          shape: 'star',
          color: '#fff3a0',
          speed: 150,
          gravity: 80,
          life: 0.45,
          size: 5,
          glow: true,
        });
      }
      const k = d.cloud / POLLEN_CLOUD; // 1 = just burst, 0 = gone
      this.puffs.forEach((p, i) => {
        const a = (i / 5) * TAU + 0.6;
        p.setPosition(
          x + Math.cos(a) * 17 * (1.5 - k),
          GROUND - 16 - Math.abs(Math.sin(a)) * 9 * (1.5 - k) - (1 - k) * 8,
        )
          .setScale(0.75 + 0.5 * (1 - k))
          .setRotation(a + d.t)
          .setAlpha(Math.min(1, k * 1.6) * 0.9);
      });
    }
  }
}

export class HazardViews {
  private pool: ViewPool<Hazard, HazardView>;

  // markDepth = in front of Pip, where the "!" badges go.
  constructor(scene: Scene, depth: number, markDepth: number, fx: FxTarget) {
    this.pool = new ViewPool<Hazard, HazardView>(
      (h) => h.kind,
      (h) =>
        h.kind === 'vine'
          ? new VineView(scene, depth, markDepth, fx)
          : h.kind === 'root'
            ? new RootView(scene, depth, markDepth, fx)
            : new PollenView(scene, depth, fx),
    );
  }
  sync(hazards: readonly Hazard[], alpha: number, dt: number) {
    this.pool.sync(hazards, (h, view, fresh) => view.sync(h, alpha, dt, fresh));
  }
}
