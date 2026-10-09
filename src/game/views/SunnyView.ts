// Sunny the Grumpy Sunflower: a stem that bends as the head sways, two stem leaves, and a head made of
// fourteen petals, a seed disc and a face.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, TAU } from '../../config';
import { PETAL_COLOR } from '../../presentation';
import type { Boss } from '../../sim/boss';
import type { Sunny } from '../../sim/bosses/sunny';
import { lerp, qbez } from '../../sim/math';
import { bake, INV, part, show } from '../art/bake';
import { circle, ellipse, fillStroke, roundRect } from '../art/draw';
import type { FaceMood } from '../art/face';
import type { BossView } from './bossViews';
import { bakeFaces, faceKey } from './faces';

const PETALS = 14;
const PETAL_LEN = 46; // the length the petal texture is baked at
const STEM_SEGMENTS = 24;
const STEM_LEAVES = [
  [0.35, -1],
  [0.6, 1],
] as const; // [how far up the stem, which side]

export function bakeSunny(scene: Scene) {
  bake(scene, 'sunny-leaf', 80, 36, 6, 18, (c) => {
    ellipse(c, 34, 0, 36, 15);
    fillStroke(c, '#7ccf63', '#3f8a33', 3);
    c.strokeStyle = '#3f8a33';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(6, 0);
    c.lineTo(62, 0);
    c.stroke();
  });
  bake(scene, 'sunny-soil', 100, 32, 50, 16, (c) => {
    ellipse(c, 0, 0, 46, 12);
    fillStroke(c, '#b47a4c', '#7a4e2c', 3);
  });
  [...PETAL_COLOR, '#ffe066'].forEach((color, i) =>
    bake(scene, `sunny-petal-${i}`, 62, 40, 31, 20, (c) => {
      ellipse(c, 0, 0, PETAL_LEN * 0.6, 17);
      fillStroke(c, color, '#d98f1a', 3);
    }),
  );
  bake(scene, 'sunny-head', 124, 124, 62, 62, (c) => {
    circle(c, 0, 0, 58);
    fillStroke(c, '#8a5a2b', '#5a381a', 4);
    circle(c, 0, 0, 46);
    fillStroke(c, '#a06a36', null);
    c.fillStyle = 'rgba(90,56,26,0.55)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      circle(c, Math.cos(a) * 51, Math.sin(a) * 51, 2.5);
      c.fill();
    }
  });
  bake(scene, 'sunny-flash', 128, 128, 64, 64, (c) => {
    c.fillStyle = '#fff';
    circle(c, 0, 0, 62);
    c.fill();
  });
  // "!" bubble = an attack is coming
  bake(scene, 'warn-bubble', 52, 56, 26, 28, (c) => {
    roundRect(c, -22, -24, 44, 48, 14);
    fillStroke(c, '#fff', '#ffb52e', 3);
    c.fillStyle = '#ff7f50';
    c.font = 'bold 36px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('!', 0, 2);
  });
  bake(scene, 'zzz', 28, 34, 14, 17, (c) => {
    c.fillStyle = '#6b8fb5';
    c.font = 'bold 26px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('z', 0, 0);
  });
  bakeFaces(scene, 'sunny', 2.3, ['angry', 'surprised', 'hurt', 'sleepy', 'happy']);
}

export class SunnyView implements BossView {
  private all: GameObjects.Container;
  private stem: GameObjects.Graphics;
  private soil: GameObjects.Image;
  private leaves: GameObjects.Image[];
  private head: GameObjects.Container;
  private petals: GameObjects.Image[] = [];
  private face: GameObjects.Image;
  private flash: GameObjects.Image;
  private bubble: GameObjects.Image;
  private zzz: GameObjects.Image;
  private blink = 3;

  constructor(scene: Scene, depth: number) {
    this.stem = scene.add.graphics();
    this.leaves = STEM_LEAVES.map(([, side]) => part(scene, 'sunny-leaf').setScale(side * INV, INV));
    for (let i = 0; i < PETALS; i++) this.petals.push(part(scene, 'sunny-petal-0'));
    this.face = part(scene, faceKey('sunny', 'sleepy'), 0, 4);
    this.flash = part(scene, 'sunny-flash').setVisible(false);
    this.head = scene.add.container(0, 0, [...this.petals, part(scene, 'sunny-head'), this.face, this.flash]);
    this.bubble = part(scene, 'warn-bubble').setVisible(false);
    this.zzz = part(scene, 'zzz').setVisible(false);
    this.soil = part(scene, 'sunny-soil');
    // one container keeps the draw order: stem, leaves, soil, head, then the bubbles on top
    this.all = scene.add
      .container(0, 0, [this.stem, ...this.leaves, this.soil, this.head, this.bubble, this.zzz])
      .setDepth(depth);
  }

  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }

  sync(boss: Boss, alpha: number, dt: number) {
    const b = boss as Sunny;
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2.5 + Math.random() * 3;

    const x = lerp(b.px, b.x, alpha),
      y = lerp(b.py, b.y, alpha),
      t = b.t;
    // the stem is a curve from the soil to just under the head
    const x0 = b.baseX,
      y0 = GROUND + 6,
      cx = b.baseX + (x - b.baseX) * 0.3,
      cy = (GROUND + y) / 2 + 30,
      y1 = y + 30;
    this.soil.setPosition(b.baseX, GROUND + 4);
    this.stem.clear();
    for (const [color, width] of [
      [0x3f8a33, 26],
      [0x6cc551, 17],
    ]) {
      this.stem.lineStyle(width, color).beginPath().moveTo(x0, y0);
      for (let i = 1; i <= STEM_SEGMENTS; i++) {
        const u = i / STEM_SEGMENTS;
        this.stem.lineTo(qbez(x0, cx, x, u), qbez(y0, cy, y1, u));
      }
      this.stem.strokePath();
    }
    STEM_LEAVES.forEach(([u, side], i) => {
      this.leaves[i]
        .setPosition(qbez(x0, cx, x, u), qbez(y0, cy, y1, u))
        .setRotation(side * -0.9 + Math.sin(t * 1.6 + u * 5) * 0.12);
    });

    this.head
      .setPosition(x, y)
      .setScale(1 + b.puff * 0.08 + (b.flash > 0 ? 0.05 : 0))
      .setRotation(Math.sin(t * 1.3) * 0.05);
    const petalKey = `sunny-petal-${b.alive ? b.phase - 1 : 3}`;
    this.petals.forEach((petal, i) => {
      const len = PETAL_LEN * (1 + b.puff * 0.2) + Math.sin(t * 3 + i) * 4 * b.happy;
      const a = (i / PETALS) * TAU + Math.sin(t * 2 + i) * 0.02;
      const d = b.r + len * 0.55;
      show(petal, petalKey);
      petal
        .setPosition(Math.cos(a) * d, Math.sin(a) * d)
        .setRotation(a)
        .setScale((INV * len) / PETAL_LEN, INV);
    });

    const sleepy = b.state === 'sleep' || (b.state === 'intro' && b.introT < 0.9);
    const mood: FaceMood = b.flash > 0 ? 'hurt' : sleepy ? 'sleepy' : !b.alive ? 'happy' : b.mood;
    show(this.face, faceKey('sunny', mood, this.blink < 0));
    this.flash.setVisible(b.flash > 0).setAlpha((b.flash / 0.12) * 0.6);

    this.bubble.setVisible(b.telegraph > 0).setPosition(x - 75, y - 100 - Math.abs(Math.sin(t * 10)) * 6);
    this.zzz.setVisible(sleepy).setPosition(x + 75, y - 70 - (t % 1) * 20);
  }
}
