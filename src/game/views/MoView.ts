// Mo, as a placeholder: a stalk, a face and a cap, moved by what the simulation says, so that the fight can be
// played before his art is drawn. The cap comes down over his face as he sulks and lifts as he rears up.
import type { GameObjects, Scene } from 'phaser';
import { CAP_HIGH, CAP_LOW, FACE_HIGH, FACE_LOW, MID, type Mo } from '../../sim/bosses/mo';
import type { Fight } from '../../sim/fight';
import { lerp } from '../../sim/math';
import { GROUND } from '../../config';
import { INV, part, show } from '../art/bake';
import type { BossView } from './bossViews';
import { Flash } from './EnemyViews';
import { faceKey } from './faces';
import { showMark } from './HazardViews';

const MARKS = 7; // the depth of warnings, above the boss's own

export class MoView implements BossView {
  private stalk: GameObjects.Image;
  private face: GameObjects.Image;
  private cap: GameObjects.Image;
  private ring: GameObjects.Image;
  private ringMark: GameObjects.Image;
  private mark: GameObjects.Image;
  private stars: GameObjects.Image[];
  private flash: Flash;
  private spin = 0;
  private warnT = 0;
  private wasUp = false;
  private bump = 0; // 1 -> 0 as he lands: he squashes

  constructor(scene: Scene, depth: number) {
    this.ring = part(scene, 'toadlet-spot')
      .setDepth(depth - 0.5)
      .setVisible(false);
    this.stalk = part(scene, 'mo-stalk').setDepth(depth);
    this.face = part(scene, faceKey('mo', 'angry')).setDepth(depth + 0.01);
    this.cap = part(scene, 'mo-cap-0').setDepth(depth + 0.02);
    this.stars = [0, 1, 2].map(() =>
      part(scene, 'burr-star')
        .setDepth(depth + 0.03)
        .setVisible(false),
    );
    this.mark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
    this.ringMark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
    this.flash = new Flash([this.stalk, this.face, this.cap]);
  }

  sync(fight: Fight, alpha: number, dt: number) {
    const b = fight.boss as Mo,
      x = lerp(b.px, b.x, alpha),
      feet = lerp(b.py, b.y, alpha) + MID,
      rear = b.rear;
    if (this.wasUp && !b.airborne) this.bump = 1;
    this.wasUp = b.airborne;
    this.bump = Math.max(0, this.bump - dt * 5);
    const squash = Math.sin(this.bump * Math.PI) * 0.16 + Math.sin(b.spring.sprung * Math.PI) * 0.2,
      capH = (CAP_LOW + (CAP_HIGH - CAP_LOW) * rear) * (1 - squash),
      faceH = (FACE_LOW + (FACE_HIGH - FACE_LOW) * rear) * (1 - squash);

    show(this.cap, `mo-cap-${b.alive ? Math.min(b.phase, 3) - 1 : 3}`);
    if (b.spinning) {
      this.spin += dt * 22;
      this.cap
        .setPosition(x, feet - 44)
        .setRotation(this.spin)
        .setScale(INV * 0.8, INV * 0.8);
    } else {
      this.spin = 0;
      this.cap
        .setPosition(x, feet - capH)
        .setRotation(b.dizzy > 0 ? Math.sin(b.t * 7) * 0.12 : Math.sin(b.t * 1.5) * 0.015)
        .setScale(INV * (1 + squash * 0.6), INV * (1 - squash));
    }
    this.stalk
      .setVisible(!b.spinning)
      .setPosition(x, feet)
      .setScale(INV * (1 + squash * 0.3), (INV * Math.max(40, capH - 10)) / 100);
    const mood = !b.alive ? 'joy' : b.dizzy > 0 ? 'worried' : b.open ? 'surprised' : 'angry';
    show(this.face, faceKey('mo', mood));
    this.face.setVisible(!b.spinning).setPosition(x, feet - faceH);

    const warning = b.telegraph > 0;
    this.warnT = warning ? this.warnT + dt : 0;
    if (warning) showMark(this.mark, x, feet - capH - 62, this.warnT);
    else this.mark.setVisible(false);
    const landing = b.landX !== null;
    this.ring.setVisible(landing);
    if (landing) {
      this.ring
        .setPosition(b.landX ?? 0, GROUND + 1)
        .setScale(INV * 2.6, INV * 1.6)
        .setAlpha(0.7 + Math.sin(b.t * 16) * 0.25);
      showMark(this.ringMark, b.landX ?? 0, GROUND - 40, this.warnT);
    } else this.ringMark.setVisible(false);
    this.stars.forEach((s, i) => {
      const a = b.t * 5 + (i * Math.PI * 2) / 3;
      s.setVisible(b.dizzy > 0).setPosition(x + Math.cos(a) * 58, feet - capH - 34 + Math.sin(a) * 12);
    });
    this.flash.sync(b.flash);
  }
}
