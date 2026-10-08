// Pip. Feet are at (x, y); the parts are stacked upward from there.
import type { GameObjects, Scene } from 'phaser';
import { GROUND } from '../../config';
import { clamp, lerp } from '../../sim/math';
import type { Player } from '../../sim/player';
import { bake, INV, part, show } from '../art/bake';
import { circle, ellipse, fillStroke, roundRect, type FaceMood } from '../art/draw';
import { bakeFaces, faceKey } from './faces';

const FEET = [
  [-8, 1],
  [8, -1],
] as const;

export function bakePlayer(scene: Scene) {
  bake(scene, 'pip-shadow', 40, 14, 20, 7, (c) => {
    c.fillStyle = 'rgba(60,40,20,0.18)';
    ellipse(c, 0, 0, 18, 5);
    c.fill();
  });
  bake(scene, 'pip-foot', 22, 16, 11, 8, (c) => {
    ellipse(c, 0, 0, 8, 5);
    fillStroke(c, '#5aa64a', '#3f8a33', 2.5);
  });
  bake(scene, 'pip-body', 50, 68, 25, 66, (c) => {
    ellipse(c, 0, -26, 21, 24);
    fillStroke(c, '#a5e37f', '#4f9d3d', 3.2);
    ellipse(c, -6, -32, 8, 11, 0.3);
    fillStroke(c, 'rgba(255,255,255,0.35)', null);
    c.strokeStyle = '#4f9d3d';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, -49);
    c.quadraticCurveTo(1, -56, 0, -62);
    c.stroke();
  });
  bake(scene, 'pip-leaf', 26, 18, 13, 9, (c) => {
    ellipse(c, 0, 0, 10, 5.5);
    fillStroke(c, '#7ccf63', '#4f9d3d', 2.5);
  });
  // hand + acorn-cap seed blaster
  bake(scene, 'pip-hand', 30, 20, 9, 10, (c) => {
    circle(c, 0, 0, 6);
    fillStroke(c, '#a5e37f', '#4f9d3d', 2.5);
    roundRect(c, 2, -6, 12, 11, 4);
    fillStroke(c, '#c58a5a', '#7a4e2c', 2.5);
  });
  bakeFaces(scene, 'pip', 0.95, ['happy', 'hurt', 'surprised', 'sleepy']);
}

export class PlayerView {
  private shadow: GameObjects.Image;
  private root: GameObjects.Container; // position, facing, squash
  private tilt: GameObjects.Container; // tips over when Pip is napping
  private upper: GameObjects.Container; // everything that bobs while running
  private feet: GameObjects.Image[];
  private leaves: GameObjects.Image[];
  private face: GameObjects.Image;
  private hand: GameObjects.Image;
  private blink = 3;

  constructor(scene: Scene, depth: number) {
    this.shadow = part(scene, 'pip-shadow').setDepth(depth - 0.1);
    this.feet = FEET.map(() => part(scene, 'pip-foot'));
    this.leaves = [part(scene, 'pip-leaf', -9, -62), part(scene, 'pip-leaf', 9, -62)];
    this.face = part(scene, faceKey('pip', 'happy'), 3, -28);
    this.hand = part(scene, 'pip-hand', 17, -22);
    this.upper = scene.add.container(0, 0, [part(scene, 'pip-body'), ...this.leaves, this.face, this.hand]);
    this.tilt = scene.add.container(0, 0, [...this.feet, this.upper]);
    this.root = scene.add.container(0, 0, [this.tilt]).setDepth(depth);
  }

  sync(p: Player, alpha: number, dt: number) {
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2 + Math.random() * 3;

    const x = lerp(p.px, p.x, alpha),
      y = lerp(p.py, p.y, alpha);
    const inAir = !p.onGround;
    const sh = clamp(1 - (GROUND - y) / 500, 0.4, 1); // the shadow shrinks as Pip rises
    this.shadow.setPosition(x, GROUND + 3).setScale(INV * sh);

    this.root.setPosition(x, y).setScale(p.facing * (1 + (1 - p.sq) * 0.8), p.sq);
    this.root.setAlpha(p.inv > 0 && p.alive && Math.floor(p.inv * 16) % 2 === 0 ? 0.45 : 1); // hurt flicker
    this.tilt.setRotation(p.alive ? 0 : -0.35);

    const run = p.onGround && Math.abs(p.vx) > 30;
    const step = run ? Math.sin(p.runT) * 7 : 0;
    FEET.forEach(([fx, ph], i) => {
      const lift = run ? Math.max(0, Math.sin(p.runT) * ph) * 4 : 0;
      this.feet[i].setPosition(fx + step * ph, -3 - lift);
    });
    this.upper.setY(run ? -Math.abs(Math.sin(p.runT)) * 3 : 0);

    const wig = Math.sin(p.t * 6) * 0.15 + (inAir ? 0.35 : 0);
    this.leaves[0].setRotation(-0.7 - wig);
    this.leaves[1].setRotation(0.7 + wig);

    const mood: FaceMood = p.hurtT > 0 ? 'hurt' : !p.alive ? 'sleepy' : inAir ? 'surprised' : 'happy';
    show(this.face, faceKey('pip', mood, this.blink < 0));
    this.hand.setX(17 - p.recoil * 5);
  }
}
