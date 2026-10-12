// The three ways the garden itself attacks: a vine sliding along the ground, roots bursting up from below,
// and pollen dropping out of the sky. Each one shows where it will strike before it can hurt, and the
// warnings all speak the same language: an orange "!" badge, or an orange ring on the ground.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, TAU, W } from '../../config';
import { POLLEN_CLOUD, POLLEN_WARN, ROOT_WARN, VINE_WARN, VineSweep, type Hazard } from '../../sim/hazards';
import type { PollenDrop, RootSpike } from '../../sim/hazards';
import { clamp, lerp } from '../../sim/math';
import type { Burst } from '../../presentation';
import { bake, INV, part, Ribbon, SOFT } from '../art/bake';
import {
  blob,
  circle,
  ellipse,
  glow,
  inside,
  leaf,
  line,
  linear,
  radial,
  roundRect,
  seeded,
  volume,
  type Ctx,
} from '../art/draw';
import { drawFace } from '../art/face';
import type { FxTarget } from '../presenter';
import { ViewPool, type PooledView } from './pool';

const OUTLINE = '#1c5f2a';
const EARTH_LINE = '#4a2a14';
const UP = -Math.PI / 2;
const POLLEN_FALL = (GROUND - 14 + 30) / 520; // seconds a pollen ball takes to reach the ground
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOutBack = (u: number) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
const DUST: Burst = {
  n: 2,
  shape: 'puff',
  color: '#f0e2c4',
  speed: 60,
  size: 6,
  life: 0.45,
  gravity: -30,
  dir: UP,
  spread: 2,
  alpha: 0.7,
  drag: 0.8,
};
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

// The vine is drawn longer than the part of it that hurts: a tail trails behind, ending in a round tip.
const VINE = new VineSweep(),
  VINE_TAIL = 56,
  VINE_HALF = (VINE.h - 6) / 2, // half its thickness, outline included
  VINE_LEN = VINE.w + VINE_TAIL + VINE_HALF,
  VINE_POINTS = Math.round(VINE_LEN / 10) + 1;

// The "!" badge pops in, then bounces. Every badge is drawn on the marks layer, in front of Pip, so a
// warning can never hide behind the hero.
function showMark(mark: GameObjects.Image, x: number, y: number, t: number) {
  mark
    .setVisible(true)
    .setPosition(x, y - Math.abs(Math.sin(t * 8.5)) * 7)
    .setScale(INV * 1.3 * easeOutBack(Math.min(1, t / 0.18)));
}

// A heap of pushed-up earth with its base on y = 0.
function drawMound(c: Ctx, w: number, h: number, rand01: () => number) {
  const shape = () => {
    c.beginPath();
    c.moveTo(-w / 2, 3);
    c.bezierCurveTo(-w * 0.4, -h * 0.9, -w * 0.12, -h, 0, -h);
    c.bezierCurveTo(w * 0.16, -h, w * 0.4, -h * 0.8, w / 2, 3);
    c.closePath();
  };
  volume(c, shape, 0, -h * 0.4, w / 2, h * 0.7, {
    fill: linear(c, 0, -h, 0, 3, ['#c48a56', '#8a5530']),
    stroke: EARTH_LINE,
    width: 3,
    light: 0.3,
    dark: 0.3,
  });
  inside(c, shape, () => {
    for (let i = 0; i < 6; i++) {
      ellipse(c, (rand01() - 0.5) * w * 0.7, -rand01() * h * 0.7, 2 + rand01() * 3, 1.5 + rand01() * 2);
      c.fillStyle = i % 2 ? 'rgba(74,42,20,0.45)' : 'rgba(232,180,128,0.6)';
      c.fill();
    }
  });
}

export function bakeHazards(scene: Scene) {
  // ---- shared ----
  bake(scene, 'warn-mark', 34, 34, 17, 17, (c) => {
    glow(c, 1, 2, 16, '#5a1a00', 0.35);
    circle(c, 0, 0, 11.5);
    line(c, '#ff7a1a', 7);
    circle(c, 0, 0, 11.5);
    c.fillStyle = linear(c, 0, -12, 0, 12, ['#ffffff', '#ffeecd']);
    c.fill();
    c.fillStyle = '#ff4d2e';
    c.font = 'bold 21px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('!', 0, 1);
  });
  bake(scene, 'dirt-mound', 104, 40, 52, 32, (c) => drawMound(c, 92, 26, seeded(51)));
  bake(scene, 'dirt-clod', 14, 14, 7, 7, (c) => {
    blob(c, 0, 0, 4.4, seeded(52), 7, 0.3);
    c.fillStyle = radial(c, 0, 0, 5, ['#c48a56', '#7a4a28'], -1.5, -1.5);
    c.fill();
    line(c, EARTH_LINE, 1.4);
  });

  // ---- vine ----
  // Its body laid out straight, head end on the left, round tip of the tail on the right. VineView
  // bends it into a wave as a ribbon.
  bake(scene, 'vine-body', VINE_LEN, VINE.h, 0, VINE.h / 2, (c) => {
    const inner = VINE_HALF - 3.5,
      body = () => roundRect(c, -40, -inner, VINE_LEN + 40 - 3.5, inner * 2, inner);
    roundRect(c, -40, -VINE_HALF, VINE_LEN + 40, VINE_HALF * 2, VINE_HALF);
    c.fillStyle = OUTLINE;
    c.fill();
    body();
    c.fillStyle = '#4caf45';
    c.fill();
    inside(c, body, () => {
      c.fillStyle = '#2f8a3a'; // shaded belly
      c.fillRect(-40, 3, VINE_LEN + 40, 6);
      c.fillStyle = '#9be36b'; // sunlit back
      c.fillRect(-40, -7.75, VINE_LEN + 40, 4.5);
    });
  });
  bake(scene, 'vine-leaf', 34, 24, 5, 12, (c) => {
    const shape = () => leaf(c, 0, 0, 25, 9, 0, 0.5, 0.8);
    shape();
    c.fillStyle = linear(c, 0, 0, 25, 0, ['#4caf45', '#a5e878']);
    c.fill();
    inside(c, shape, () => glow(c, 14, -5, 11, '#ffffff', 0.4, 4));
    shape();
    line(c, OUTLINE, 2.6);
    c.beginPath();
    c.moveTo(3, 0);
    c.lineTo(20, 0);
    line(c, '#e0fbb0', 1.3, 0.8);
  });
  // a thorn pointing up from (0, 0)
  bake(scene, 'vine-thorn', 16, 18, 8, 15, (c) => {
    c.beginPath();
    c.moveTo(-5.5, 1);
    c.quadraticCurveTo(-1.5, -4, 0.5, -12);
    c.quadraticCurveTo(2.5, -4, 5.5, 1);
    c.closePath();
    c.fillStyle = linear(c, -5, 0, 5, 0, ['#fff7d0', '#e2c98c']);
    c.fill();
    line(c, OUTLINE, 2.2);
  });
  // the vine's head leads the way, facing left
  bake(scene, 'vine-head', 66, 58, 34, 30, (c) => {
    for (const [rot, len] of [
      [-0.7, 24],
      [-0.2, 27],
      [0.35, 23],
    ] as const) {
      leaf(c, 6, 0, len, 8.5, rot, 0.5, 0.8);
      c.fillStyle = linear(c, 6, 0, 30, 0, ['#3d9a3c', '#7fd65a']);
      c.fill();
      line(c, OUTLINE, 2.6);
    }
    volume(c, () => circle(c, 0, 0, 19), 0, 0, 19, 19, {
      fill: radial(c, 0, 0, 21, ['#bdf086', '#6cc551', '#3f9a3c'], -6, -7),
      stroke: OUTLINE,
      width: 3,
      light: 0.3,
      dark: 0.34,
      shade: '#0f4a22',
    });
    drawFace(c, -3, 1, 0.84, 'angry');
  });

  // ---- root: drawn at full height with (0, 0) on the ground line ----
  bake(scene, 'root-spike', 84, 136, 42, 126, (c) => {
    const twig = (x: number, y: number, rot: number, len: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.beginPath();
      c.moveTo(0, -5);
      c.quadraticCurveTo(len * 0.6, -4, len, 0);
      c.quadraticCurveTo(len * 0.6, 3, 0, 5);
      c.closePath();
      c.restore();
      c.fillStyle = '#a8703e';
      c.fill();
      line(c, '#3d2414', 2.6);
    };
    twig(-11, -36, Math.PI + 0.75, 22);
    twig(9, -58, -0.7, 20);
    const shape = () => {
      c.beginPath();
      c.moveTo(-24, 6);
      c.bezierCurveTo(-20, -30, -4, -62, 3, -99);
      c.bezierCurveTo(8, -64, 12, -32, 24, 6);
      c.closePath();
    };
    shape();
    c.fillStyle = linear(c, -22, 0, 22, 0, ['#e0ae76', '#a8703e', '#6e4426']);
    c.fill();
    inside(c, shape, () => {
      // the grain of the wood, twisting around the root
      for (let i = 0; i < 7; i++) {
        const y = -6 - i * 14;
        c.beginPath();
        c.moveTo(-26, y + 6);
        c.quadraticCurveTo(0, y - 9, 26, y - 2);
        line(c, '#5a361c', 2, 0.42);
      }
      glow(c, -8, -44, 15, '#fff0d0', 0.42, 48);
    });
    shape();
    line(c, '#3d2414', 3);
    // a sprig at the tip
    for (const rot of [-2.3, -0.9]) {
      leaf(c, 3, -98, 13, 4.6, rot, 0.5, 0.8);
      c.fillStyle = '#8ade5c';
      c.fill();
      line(c, OUTLINE, 2);
    }
  });
  bake(scene, 'root-mound', 84, 28, 42, 21, (c) => drawMound(c, 72, 14, seeded(53)));
  bake(scene, 'root-crack', 78, 18, 39, 9, (c) => {
    c.beginPath();
    c.moveTo(-34, 1);
    c.lineTo(-20, -3);
    c.lineTo(-9, 3);
    c.lineTo(2, -4);
    c.lineTo(13, 2);
    c.lineTo(23, -2);
    c.lineTo(34, 2);
    c.moveTo(-9, 3);
    c.lineTo(-14, 7);
    c.moveTo(13, 2);
    c.lineTo(18, 7);
    line(c, '#2f1a0c', 3);
    line(c, '#8a5530', 1.2);
  });

  // ---- pollen ----
  // where a pollen ball is about to land
  bake(scene, 'pollen-target', 76, 30, 38, 15, (c) => {
    ellipse(c, 0, 0, 31, 10);
    c.fillStyle = 'rgba(255,196,60,0.38)';
    c.fill();
    line(c, '#7a3d00', 5.5, 0.55);
    line(c, '#ffb01f', 3.2);
    ellipse(c, 0, 0, 17, 5.5);
    line(c, '#fff0a8', 2, 0.9);
  });
  // a faint column of light showing its path down; (0, 0) is where it meets the ground
  bake(
    scene,
    'pollen-beam',
    44,
    GROUND,
    22,
    GROUND,
    (c) => {
      c.fillStyle = linear(c, -22, 0, 22, 0, [
        'rgba(255,226,120,0)',
        'rgba(255,226,120,0.8)',
        'rgba(255,226,120,0)',
      ]);
      c.fillRect(-22, -GROUND, 44, GROUND);
      c.globalCompositeOperation = 'destination-in';
      c.fillStyle = linear(c, 0, -GROUND, 0, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']);
      c.fillRect(-22, -GROUND, 44, GROUND);
      c.globalCompositeOperation = 'source-over';
    },
    SOFT,
  );
  bake(scene, 'pollen-ball', 40, 40, 20, 20, (c) => {
    // a fuzzy ball: a ring of little bumps around a bright middle
    const fuzz = () => {
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        c.moveTo(Math.cos(a) * 11.5 + 4.2, Math.sin(a) * 11.5);
        c.arc(Math.cos(a) * 11.5, Math.sin(a) * 11.5, 4.2, 0, TAU);
      }
      c.moveTo(12, 0);
      c.arc(0, 0, 12, 0, TAU);
    };
    fuzz();
    line(c, '#a66a06', 4.4);
    fuzz();
    c.fillStyle = radial(c, 0, 0, 16, ['#fffbd6', '#ffe36a', '#f5b21c'], -4, -5);
    c.fill();
    circle(c, -4, -5, 3);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fill();
  });
  bake(scene, 'pollen-glow', 84, 84, 42, 42, (c) => glow(c, 0, 0, 41, '#ffe680', 0.8), SOFT);
  bake(
    scene,
    'pollen-puff',
    52,
    48,
    26,
    24,
    (c) => {
      for (const [x, y, r] of [
        [-8, 4, 13],
        [8, 4, 13],
        [0, -6, 14],
      ]) {
        circle(c, x, y, r);
        c.fillStyle = radial(c, x, y, r, ['#fff8c8', '#ffe066', 'rgba(245,190,40,0.75)'], x - 3, y - 4);
        c.fill();
      }
    },
    SOFT,
  );
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
