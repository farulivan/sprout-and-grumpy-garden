// Mo the Moody Mushroom. His parts are baked in mo/art.ts and mo/face.ts; this file moves them.
// The simulation says where he stands, how far he has reared up, and when he attacks or gets hit. A sulking kid in a
// hood at rest, and an outburst when he attacks: most of who he is comes from how different the two look.
import { BlendModes, TintModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import { CAP_HIGH, CAP_LOW, MID, type Mo } from '../../sim/bosses/mo';
import type { Fight } from '../../sim/fight';
import { clamp, lerp } from '../../sim/math';
import { hex, INV, part, Ribbon, show, unit } from '../art/bake';
import type { FxTarget } from '../presenter';
import type { BossView } from './bossViews';
import { showMark } from './HazardViews';
import { MO_PALETTE } from './mo/art';
import {
  EYE_X,
  EYE_Y,
  eyesOpen,
  FURIOUS_EYE,
  LOOK,
  moFaceKey,
  PUPIL_DOWN,
  pupilSize,
  type MoFace,
} from './mo/face';

const MARKS = 6.5; // the depth of warnings: in front of Pip, so they can't hide behind him
const STALK_POINTS = 10;
const STALK_FOOT = 30; // his stalk's ribbon starts this far above his feet, inside the foot
const SHOULDER = 44; // how far out from his middle his arms are
const HIT_LIGHT = 0x707070; // a hit lights him up for a moment, and he stays himself: this much is added to his colours
// What his arms are doing, as an angle for one side; the other side mirrors it.
const ARMS = { droop: 1.05, up: -1, out: -0.25, flail: -1.35 } as const;
type Arms = keyof typeof ARMS;

export class MoView implements BossView {
  private rig: GameObjects.Container; // all of him, standing on (0, 0)
  private pool: GameObjects.Image;
  private shadow: GameObjects.Image;
  private gills: GameObjects.Image;
  private stalk: Ribbon;
  private foot: GameObjects.Image;
  private skirt: GameObjects.Image;
  private arms: GameObjects.Image[];
  private eyes: GameObjects.Image;
  private pupils: GameObjects.Image[];
  private face: GameObjects.Image;
  private cap: GameObjects.Image;
  private capGlow: GameObjects.Image;
  private capGlowUnit: number;
  private poolUnit: number;
  private shadowUnit: number;
  private ring: GameObjects.Image;
  private ringMark: GameObjects.Image;
  private mark: GameObjects.Image;
  private lit = false;
  private warnT = 0;
  private armAngle: number = ARMS.droop;
  private look = 0;

  constructor(scene: Scene, depth: number, _fx: FxTarget) {
    this.poolUnit = unit('mo-pool');
    this.shadowUnit = unit('mo-shadow');
    this.capGlowUnit = unit('mo-cap-glow-0');
    this.shadow = part(scene, 'mo-shadow').setDepth(depth - 0.04);
    this.pool = part(scene, 'mo-pool')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.02);
    this.ring = part(scene, 'toadlet-spot')
      .setDepth(depth - 0.03)
      .setVisible(false);
    this.gills = part(scene, 'mo-gills');
    this.stalk = new Ribbon(scene, 'mo-stalk', STALK_POINTS);
    this.foot = part(scene, 'mo-foot');
    this.skirt = part(scene, 'mo-skirt');
    this.arms = [-1, 1].map((side) => part(scene, 'mo-arm').setScale(side * INV, INV));
    this.eyes = part(scene, 'mo-eye');
    this.pupils = [-1, 1].map(() => part(scene, 'mo-pupil'));
    this.face = part(scene, moFaceKey('sleepy'));
    this.cap = part(scene, 'mo-cap-0');
    this.capGlow = part(scene, 'mo-cap-glow-0').setBlendMode(BlendModes.ADD);
    this.rig = scene.add
      .container(0, 0, [
        this.gills,
        this.stalk.rope,
        this.foot,
        this.skirt,
        ...this.arms,
        this.eyes,
        ...this.pupils,
        this.face,
        this.cap,
        this.capGlow,
      ])
      .setDepth(depth);
    this.mark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
    this.ringMark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
  }

  sync(fight: Fight, alpha: number, dt: number) {
    const b = fight.boss as Mo,
      p = fight.player,
      x = lerp(b.px, b.x, alpha),
      feet = lerp(b.py, b.y, alpha) + MID,
      t = b.t,
      phase = Math.min(b.phase, 3) - 1,
      roaring = b.state === 'intro' && b.introT >= 0.9,
      asleep = b.state === 'sleep' || (b.state === 'intro' && !roaring);

    // ---- what he is doing: the first of these that matches ----
    let face: MoFace, arms: Arms;
    if (!b.alive) [face, arms] = ['joy', 'up'];
    else if (asleep) [face, arms] = ['sleepy', 'droop'];
    else if (roaring) [face, arms] = ['shout', 'up'];
    else if (b.dizzy > 0) [face, arms] = ['dizzy', 'droop'];
    else if (b.flash > 0 && b.faceOpen) [face, arms] = ['ouch', this.posed(b)];
    else if (b.open || b.airborne)
      [face, arms] = [(['shout', 'cross', 'furious'] as const)[phase], this.posed(b)];
    else [face, arms] = [(['sulk', 'cross', 'cross'] as const)[phase], 'droop'];

    // ---- his shape, measured up from his feet ----
    const rear = !b.alive ? 0.9 : roaring ? 1 : b.dizzy > 0 ? Math.min(b.rear, 0.72) : b.rear,
      capH = lerp(CAP_LOW, CAP_HIGH, rear),
      faceH = capH - lerp(46, 63, rear);
    this.rig.setPosition(x, feet);

    const capTilt = b.dizzy > 0 ? 0.2 : Math.sin(t * 1.5) * 0.015,
      capPos = (image: GameObjects.Image) => image.setPosition(0, -capH).setRotation(capTilt);
    capPos(this.gills)
      .setVisible(rear > 0.25)
      .setAlpha(clamp((rear - 0.25) / 0.12, 0, 1));
    const top = capH - 6,
      span = top - STALK_FOOT;
    for (let i = 0; i < STALK_POINTS; i++) {
      this.stalk.set(i, 0, -(STALK_FOOT + (span * i) / (STALK_POINTS - 1)));
    }
    this.stalk.bend();
    this.skirt
      .setPosition(0, -capH + 42)
      .setVisible(rear > 0.4)
      .setAlpha(clamp((rear - 0.4) / 0.1, 0, 1));

    // ---- his arms ----
    const armY = -Math.max(30, faceH - 44);
    this.armAngle += (ARMS[arms] - this.armAngle) * Math.min(1, dt * 14);
    this.arms.forEach((arm, i) => {
      const side = i ? 1 : -1,
        flail = arms === 'flail' ? side * 0.25 : 0;
      arm.setPosition(side * SHOULDER, armY).setRotation(side * (this.armAngle + flail));
    });

    // ---- his face, and his eyes watching Pip ----
    const open = eyesOpen(face);
    show(this.face, moFaceKey(face));
    this.face.setPosition(0, -faceH);
    this.eyes
      .setVisible(open)
      .setPosition(0, -faceH)
      .setTint(face === 'furious' ? FURIOUS_EYE : 0xffffff);
    this.look += (clamp((p.x - x) / 200, -1, 1) - this.look) * Math.min(1, dt * 10);
    this.pupils.forEach((pupil, i) =>
      pupil
        .setVisible(open)
        .setPosition((i ? 1 : -1) * EYE_X + this.look * LOOK, -faceH + EYE_Y + PUPIL_DOWN)
        .setScale(INV * pupilSize(face)),
    );

    // ---- his cap ----
    const set = b.alive ? phase : 3;
    show(this.cap, `mo-cap-${set}`);
    capPos(this.cap);
    show(this.capGlow, `mo-cap-glow-${set}`);
    capPos(this.capGlow).setScale(this.capGlowUnit).setAlpha(0.5);

    // ---- light and shadow on the ground under him ----
    this.pool
      .setPosition(x, GROUND + 2)
      .setTint(hex(MO_PALETTE.caps[set].glow))
      .setAlpha(0.35)
      .setScale(this.poolUnit);
    this.shadow.setPosition(x, GROUND + 3).setScale(this.shadowUnit);

    // ---- warnings ----
    const warning = b.telegraph > 0;
    this.warnT = warning ? this.warnT + dt : 0;
    if (warning) showMark(this.mark, x, feet - capH - 92, this.warnT);
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
    this.showHit(b.flash > 0);
  }

  private showHit(hit: boolean) {
    if (hit === this.lit) return;
    this.lit = hit;
    const parts = [this.cap, this.foot, this.skirt, this.gills, ...this.arms];
    for (const image of parts)
      if (hit) image.setTint(HIT_LIGHT).setTintMode(TintModes.ADD);
      else image.clearTint();
    this.stalk.rope
      .setTintMode(hit ? TintModes.ADD : TintModes.MULTIPLY)
      .setColors(hit ? HIT_LIGHT : 0xffffff);
  }

  // How he throws his arms about when he is up to something, by how cross he is.
  private posed(b: Mo): Arms {
    return b.airborne ? 'flail' : (['up', 'out', 'flail'] as const)[Math.min(b.phase, 3) - 1];
  }
}
