// Pip, the little sprout hero. Feet are at (x, y); the parts are stacked upward from there.
// The simulation moves Pip. This view adds the life: feet that run, tuck and dangle, a sprout that trails
// behind like a ponytail, a lean into the run, the blaster swinging up to aim, a flop onto the back for
// the nap, and a cheer when Sunny blooms.
import { BlendModes, TintModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import type { Fight } from '../../sim/fight';
import { clamp, lerp } from '../../sim/math';
import { bake, INV, part, show, SOFT } from '../art/bake';
import {
  circle,
  ellipse,
  glow,
  inside,
  leaf,
  line,
  linear,
  radial,
  roundRect,
  sparkle,
  volume,
  type Ctx,
} from '../art/draw';
import type { FaceMood } from '../art/face';
import type { FxTarget } from '../presenter';
import { bakeFaces, faceKey } from './faces';

const OUTLINE = '#226a2e';
const WOOD_LINE = '#4a2a14';
const RUN_SPEED = 290; // Pip's top speed in the simulation, for scaling the lean and the trailing sprout
const SHOULDER = { x: 17, y: -25 }; // out to the side, so the blaster never hides Pip's face
const UP = -Math.PI / 2;

const body = (c: Ctx) => {
  c.beginPath();
  c.moveTo(0, -50);
  c.bezierCurveTo(15, -50, 22, -38, 22, -24);
  c.bezierCurveTo(22, -9, 13, -2, 0, -2);
  c.bezierCurveTo(-13, -2, -22, -9, -22, -24);
  c.bezierCurveTo(-22, -38, -15, -50, 0, -50);
  c.closePath();
};

export function bakePlayer(scene: Scene) {
  bake(scene, 'pip-shadow', 52, 18, 26, 9, (c) => glow(c, 0, 0, 24, '#14301a', 0.5, 7), SOFT);
  // a faint light behind Pip, so the hero never sinks into a busy background
  bake(scene, 'pip-halo', 84, 84, 42, 42, (c) => glow(c, 0, 0, 41, '#ffffff', 0.5), SOFT);
  bake(scene, 'pip-foot', 26, 20, 13, 11, (c) => {
    volume(c, () => ellipse(c, 0, 0, 8.5, 5.6), 0, 0, 8.5, 5.6, {
      fill: linear(c, 0, -6, 0, 6, ['#d59c60', '#8c5730']),
      stroke: WOOD_LINE,
      width: 2.6,
      light: 0.4,
      dark: 0.2,
    });
  });
  bake(scene, 'pip-body', 58, 64, 29, 58, (c) => {
    volume(c, () => body(c), 0, -26, 22, 24, {
      fill: radial(c, 0, -26, 30, ['#e6fd9e', '#b3ee6a', '#82d44c'], -8, -37),
      light: 0.34,
      dark: 0.36,
      shade: '#145a2a',
    });
    // a paler tummy, where the face sits
    inside(
      c,
      () => body(c),
      () => glow(c, 1, -24, 21, '#f6ffd6', 0.6, 19),
    );
    body(c);
    line(c, OUTLINE, 3.4);
  });
  bake(scene, 'pip-stalk', 16, 24, 8, 21, (c) => {
    const path = () => {
      c.beginPath();
      c.moveTo(0, 2);
      c.quadraticCurveTo(-2, -6, 1, -14);
    };
    path();
    line(c, OUTLINE, 6);
    path();
    line(c, '#7fd65a', 2.8);
  });
  bake(scene, 'pip-leaf', 30, 22, 5, 11, (c) => {
    const shape = () => leaf(c, 0, 0, 20, 7.5, 0, 0.5, 0.8);
    shape();
    c.fillStyle = linear(c, 0, 0, 20, 0, ['#58b947', '#aaec7a']);
    c.fill();
    inside(c, shape, () => glow(c, 11, -4, 9, '#ffffff', 0.4, 3));
    shape();
    line(c, OUTLINE, 2.6);
    c.beginPath();
    c.moveTo(3, 0);
    c.lineTo(15, 0);
    line(c, '#e0fbb0', 1.3, 0.8);
  });
  bake(scene, 'pip-hand', 16, 16, 8, 8, (c) => {
    circle(c, 0, 0, 5.2);
    c.fillStyle = '#a5e560';
    c.fill();
    line(c, OUTLINE, 2.4);
  });
  // The seed blaster: an acorn cup held in one hand. (0, 0) is the shoulder it swings from.
  bake(scene, 'pip-blaster', 42, 28, 8, 14, (c) => {
    volume(c, () => roundRect(c, 5, -7.5, 17, 15, 5.5), 13, 0, 9, 7.5, {
      fill: linear(c, 0, -8, 0, 8, ['#e0aa6a', '#9a6234']),
      stroke: WOOD_LINE,
      width: 2.6,
      light: 0.45,
      dark: 0.25,
    });
    // the scaly cap of the acorn
    for (const x of [9, 14]) {
      c.beginPath();
      c.moveTo(x, -7);
      c.quadraticCurveTo(x + 3, 0, x, 7);
      line(c, WOOD_LINE, 1.3, 0.45);
    }
    ellipse(c, 22.5, 0, 3.4, 7.2);
    c.fillStyle = '#2c180c';
    c.fill();
    line(c, WOOD_LINE, 2.4);
    circle(c, 3, 1, 5.4);
    c.fillStyle = '#b3ee6a';
    c.fill();
    line(c, OUTLINE, 2.4);
  });
  bake(scene, 'pip-flash', 48, 48, 24, 24, (c) => {
    glow(c, 0, 0, 22, '#eaffb0', 0.9);
    sparkle(c, 0, 0, 22);
    c.fillStyle = '#ffffff';
    c.fill();
  });
  bakeFaces(scene, 'pip', 1, ['happy', 'joy', 'hurt', 'surprised', 'sleepy', 'worried']);
}

export class PlayerView {
  private shadow: GameObjects.Image;
  private halo: GameObjects.Image;
  private root: GameObjects.Container; // position, facing, squash
  private tilt: GameObjects.Container; // leans into a run, tips over for the nap
  private upper: GameObjects.Container; // everything that bobs while running
  private sprout: GameObjects.Container; // the stalk and its two leaves
  private feet: GameObjects.Image[];
  private leaves: GameObjects.Image[];
  private face: GameObjects.Image;
  private arm: GameObjects.Container;
  private muzzle: GameObjects.Image;
  private skin: GameObjects.Image[]; // every part that flashes white when Pip is hit
  private t = Math.random() * 10; // this view's own clock: Pip still breathes while the fight is paused on a card
  private blink = 1 + Math.random() * 3;
  private sway = 0; // the sprout trails behind on a spring
  private swayV = 0;
  private aim = 0;
  private nap = 0; // 0 = up, 1 = flat on the back
  private dustT = 0;
  private flashed = false;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
  ) {
    this.shadow = part(scene, 'pip-shadow').setDepth(depth - 0.2);
    this.halo = part(scene, 'pip-halo')
      .setDepth(depth - 0.1)
      .setBlendMode(BlendModes.ADD)
      .setAlpha(0.24);
    this.feet = [part(scene, 'pip-foot'), part(scene, 'pip-foot')];
    this.leaves = [part(scene, 'pip-leaf', 1, -14), part(scene, 'pip-leaf', 1, -14)];
    this.sprout = scene.add.container(0, -48, [part(scene, 'pip-stalk'), ...this.leaves]);
    this.face = part(scene, faceKey('pip', 'happy'), 1, -27);
    this.muzzle = part(scene, 'pip-flash', 30, 0).setBlendMode(BlendModes.ADD).setVisible(false);
    const blaster = part(scene, 'pip-blaster');
    this.arm = scene.add.container(SHOULDER.x, SHOULDER.y, [blaster, this.muzzle]);
    const backHand = part(scene, 'pip-hand', -18, -22);
    const bodyPart = part(scene, 'pip-body');
    this.upper = scene.add.container(0, 0, [this.sprout, backHand, bodyPart, this.face, this.arm]);
    this.tilt = scene.add.container(0, 0, [...this.feet, this.upper]);
    this.root = scene.add.container(0, 0, [this.tilt]).setDepth(depth);
    this.skin = [...this.feet, ...this.leaves, backHand, bodyPart, blaster, this.face];
  }

  sync(fight: Fight, alpha: number, dt: number) {
    const p = fight.player,
      t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2 + Math.random() * 3;

    const x = lerp(p.px, p.x, alpha),
      y = lerp(p.py, p.y, alpha);
    const inAir = !p.onGround,
      forward = (p.vx * p.facing) / RUN_SPEED, // -1..1: how fast Pip moves the way Pip faces
      run = p.onGround && Math.abs(p.vx) > 30,
      cheering = p.alive && (fight.state === 'ending' || fight.state === 'win'),
      idle = p.onGround && !run;

    // The shadow falls on whatever is under Pip: a leaf platform or the ground.
    let floor = GROUND;
    for (const leafPad of fight.platforms)
      if (x > leafPad.x - 4 && x < leafPad.x + leafPad.w + 4 && y <= leafPad.y + 1 && leafPad.y < floor)
        floor = leafPad.y;
    const near = clamp(1 - (floor - y) / 260, 0.35, 1);
    this.shadow
      .setPosition(x, floor + 3)
      .setScale(near, near)
      .setAlpha(0.5 + near * 0.5);

    // ---- whole body ----
    const hop = cheering && idle ? Math.abs(Math.sin(t * 9)) * 12 : 0;
    const breathe = idle && !cheering ? Math.sin(t * 3.2) * 0.022 : 0;
    this.root.setPosition(x, y - hop).setScale(p.facing * (1 + (1 - p.sq) * 0.8 - breathe), p.sq + breathe);
    // after a hit Pip flickers until the hits count again
    this.root.setAlpha(p.inv > 0 && p.alive && p.hurtT <= 0.38 ? 0.78 + 0.22 * Math.sin(p.inv * 42) : 1);
    this.halo.setPosition(x, y - 26 - hop);
    const hit = p.hurtT > 0.4; // the first tenth of a second after a hit: a white flash
    if (hit !== this.flashed) {
      this.flashed = hit;
      for (const img of this.skin)
        if (hit) img.setTint(0xffffff).setTintMode(TintModes.FILL);
        else img.clearTint();
    }

    this.nap += ((p.alive ? 0 : 1) - this.nap) * Math.min(1, dt * 7);
    const lean = inAir ? forward * 0.07 : forward * 0.13;
    this.tilt.setRotation(lerp(lean, -1.42, this.nap)).setY(-19 * this.nap);

    // ---- feet ----
    this.feet.forEach((foot, i) => {
      const side = i ? 1 : -1,
        swing = p.runT + i * Math.PI;
      if (run) {
        foot
          .setPosition(side * 6 + Math.sin(swing) * 8, -3 - Math.max(0, Math.cos(swing)) * 5.5)
          .setRotation(Math.sin(swing) * -0.35);
      } else if (inAir) {
        const rising = p.vy < 0;
        // tucked up on the way up, dangling apart on the way down
        foot.setPosition(side * (rising ? 5 : 9), rising ? -7 : -1).setRotation(side * (rising ? 0.5 : -0.3));
      } else {
        foot.setPosition(side * 8, -3).setRotation(0);
      }
    });
    this.upper.setY(run ? -Math.abs(Math.sin(p.runT)) * 2.6 : 0).setX(-p.recoil * 1.6);

    // ---- sprout: trails behind the run and streams up behind a fall ----
    const drag = -forward * 0.5 + clamp(p.vy / 900, -0.4, 0.5) * 0.35;
    this.swayV += ((drag - this.sway) * 130 - this.swayV * 11) * dt;
    this.sway += this.swayV * dt;
    this.sprout.setRotation(this.sway + Math.sin(t * 2.4) * 0.05);
    // the two leaves fold down while rising and lift like a parachute while falling
    const spread = 0.8 + (inAir ? clamp(p.vy / 500, -1, 1) * -0.55 : 0) + Math.sin(t * 5) * 0.08 + hop * 0.03;
    this.leaves[0].setRotation(UP - spread);
    this.leaves[1].setRotation(UP + spread);

    // ---- face ----
    const mood: FaceMood =
      p.hurtT > 0
        ? 'hurt'
        : !p.alive
          ? 'sleepy'
          : cheering
            ? 'joy'
            : inAir
              ? p.vy < 0
                ? 'joy'
                : 'surprised'
              : p.hp === 1
                ? 'worried'
                : 'happy';
    show(this.face, faceKey('pip', mood, this.blink < 0));
    this.face.setX(1 + clamp(forward, -1, 1) * 1.5);

    // ---- blaster ----
    const aimAt = cheering ? -1.25 : !p.alive ? 0.9 : p.aimUp ? -0.78 : 0;
    this.aim += (aimAt - this.aim) * Math.min(1, dt * 22);
    this.arm
      .setRotation(this.aim + (cheering ? Math.sin(t * 9) * 0.25 : 0))
      .setPosition(
        SHOULDER.x - Math.cos(this.aim) * p.recoil * 4,
        SHOULDER.y - Math.sin(this.aim) * p.recoil * 4,
      );
    this.muzzle
      .setVisible(p.recoil > 0.5)
      .setScale(INV * (0.5 + p.recoil * 0.6))
      .setRotation(t * 30);

    // ---- dust at the heels ----
    if (run && p.alive) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.13;
        this.fx.burst(x - p.facing * 10, y - 1, {
          n: 1,
          shape: 'puff',
          color: '#f4ead0',
          speed: 34,
          dir: UP - p.facing * 0.9,
          spread: 0.6,
          gravity: -20,
          life: 0.36,
          size: 4.5,
          alpha: 0.55,
        });
      }
    }
  }
}
