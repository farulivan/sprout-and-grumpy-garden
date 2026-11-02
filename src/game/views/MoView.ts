// Mo the Moody Mushroom. His parts are baked in mo/art.ts and mo/face.ts; this file moves them.
// The simulation says where he stands, how far he has reared up, and when he attacks or gets hit. Everything else
// here is acting. He is a sulking kid in a hood at rest and an outburst when he attacks, and most of who he is comes
// from how different the two look. Everything big has an anticipation, an action and a settle.
import { BlendModes, TintModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, STEP, TAU, UP } from '../../config';
import { DUST } from '../../presentation';
import { CAP_HIGH, CAP_LOW, MID, type Mo } from '../../sim/bosses/mo';
import type { Fight } from '../../sim/fight';
import { clamp, lerp } from '../../sim/math';
import { hex, INV, part, Ribbon, show, unit } from '../art/bake';
import { rand } from '../motion';
import type { FxTarget } from '../presenter';
import type { BossView } from './bossViews';
import { showMark } from './marks';
import { MO_PALETTE, WHIRL_FRAMES } from './mo/art';
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
import type { AcidTrail } from './mo/smoke';

const MARKS = 6.5; // the depth of warnings: in front of Pip, so they can't hide behind him
const STALK_POINTS = 10;
const STALK_FOOT = 30; // his stalk's ribbon starts this far above his feet, inside the foot
const SHOULDER = 44; // how far out from his middle his arms are
const HIT_LIGHT = 0x3c3c3c; // a hit lights him up for a moment, and he stays himself: this much is added to his colours
const CAP_FADE = 0.5; // seconds his cap takes to turn a new colour
const LANDED = 0.25; // seconds he looks winded after coming down
const RAGE = 1.3; // seconds of tantrum at each new phase
const CROUCH = 0.18; // over the last of a Big Hop's warning, he crouches
const SPORES = 3; // seconds golden spores rise from him, once he is cheered up
const WHIRL_FPS = 30;
const WHIRL_SCALE = 0.85; // keeps its top close to the simulation's whirl, and low enough for a held jump to clear
const WHIRL_LEAN = 0.1; // he leans into the way he is going
const WHIRL_HAZE = 30; // he leaves a puff of haze every this many pixels
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
  private capWas: GameObjects.Image; // the colour he is turning from, under the new one
  private cap: GameObjects.Image;
  private capGlow: GameObjects.Image;
  private whirl: GameObjects.Image;
  private arcs: GameObjects.Image[];
  private stars: GameObjects.Image[];
  private body: GameObjects.Container; // all but the whirl he turns into
  private ring: GameObjects.Image;
  private ringMark: GameObjects.Image;
  private mark: GameObjects.Image;
  private units: { glow: number; pool: number; shadow: number; arc: number };

  private seen: Mo | null = null;
  private clock = 0; // keeps going when the fight is in slow motion
  private lit = false;
  private warnT = 0;
  private armAngle: number = ARMS.droop;
  private look = 0;
  private blink = 1 + Math.random() * 3;
  private sq = 0; // squash: positive squashes, negative stretches
  private sqV = 0;
  private capLag = 0;
  private lean = 0;
  private kick = 0; // how far the last hit has knocked him back
  private kickV = 0;
  private rage = 0; // 1 -> 0 during the tantrum at each new phase
  private set = 0; // which cap he is wearing
  private capFade = 1;
  private pose = 0; // 0 -> 1 as he goes into a pose that is for show only: the roar, the tantrum, the ending
  private wasAir = false;
  private airT = 0;
  private landedT = 0;
  private prevFlash = 0;
  private prevPhase = 1;
  private sighT = 4 + Math.random() * 2;
  private sigh = 0;
  private lastX = 0; // where the simulation last had him
  private slide = 0; // he has come off a wall: how far he has yet to stagger
  private hazeX = 0; // where he last left a puff of haze
  private dustT = 0;
  private sparkT = 0;
  private sparkSide = 1;
  private sporeT = 0; // cheered up, golden spores rise from him for a while
  private spores = 0;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
    private trail: AcidTrail,
  ) {
    this.units = {
      glow: unit('mo-cap-glow-0'),
      pool: unit('mo-pool'),
      shadow: unit('mo-shadow'),
      arc: unit('mo-whirl-arc-0'),
    };
    this.shadow = part(scene, 'mo-shadow').setDepth(depth - 0.04);
    this.ring = part(scene, 'toadlet-spot')
      .setDepth(depth - 0.03)
      .setVisible(false);
    this.pool = part(scene, 'mo-pool')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.02);
    this.gills = part(scene, 'mo-gills');
    this.stalk = new Ribbon(scene, 'mo-stalk', STALK_POINTS);
    this.foot = part(scene, 'mo-foot');
    this.skirt = part(scene, 'mo-skirt');
    this.arms = [-1, 1].map((side) => part(scene, 'mo-arm').setScale(side * INV, INV));
    this.eyes = part(scene, 'mo-eye');
    this.pupils = [-1, 1].map(() => part(scene, 'mo-pupil'));
    this.face = part(scene, moFaceKey('sleepy'));
    this.capWas = part(scene, 'mo-cap-0').setVisible(false);
    this.cap = part(scene, 'mo-cap-0');
    this.capGlow = part(scene, 'mo-cap-glow-0').setBlendMode(BlendModes.ADD);
    this.whirl = part(scene, 'mo-whirl-0')
      .setScale(INV * WHIRL_SCALE)
      .setVisible(false);
    this.arcs = [0, 1, 2].map(() =>
      part(scene, 'mo-whirl-arc-0').setBlendMode(BlendModes.ADD).setVisible(false),
    );
    this.stars = [0, 1, 2].map(() =>
      part(scene, 'burr-star')
        .setScale(INV * 1.5)
        .setDepth(depth + 0.01)
        .setVisible(false),
    );
    this.body = scene.add.container(0, 0, [
      this.gills,
      this.stalk.rope,
      this.foot,
      this.skirt,
      ...this.arms,
      this.eyes,
      ...this.pupils,
      this.face,
      this.capWas,
      this.cap,
      this.capGlow,
    ]);
    this.rig = scene.add.container(0, 0, [this.body, this.whirl, ...this.arcs]).setDepth(depth);
    this.mark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
    this.ringMark = part(scene, 'warn-mark').setDepth(MARKS).setVisible(false);
  }

  sync(fight: Fight, alpha: number, dt: number) {
    const b = fight.boss as Mo,
      p = fight.player;
    if (b !== this.seen) this.reset(b); // a new fight
    this.clock += dt;
    // Coming off a wall after a spin, the simulation puts him back in his range at once: he staggers there instead.
    const jumped = Math.abs(b.x - this.lastX) > 40;
    if (jumped) this.slide += this.lastX - b.x;
    this.lastX = b.x;
    this.slide *= Math.exp(-dt * 9);
    const x = (jumped ? b.x : lerp(b.px, b.x, alpha)) + this.slide,
      feet = lerp(b.py, b.y, alpha) + MID,
      t = b.t,
      clock = this.clock,
      phase = Math.min(b.phase, 3) - 1,
      roaring = b.state === 'intro' && b.introT >= 0.9,
      asleep = b.state === 'sleep' || (b.state === 'intro' && !roaring),
      vx = jumped ? 0 : (b.x - b.px) / STEP,
      vy = (b.y - b.py) / STEP;

    // ---- reactions the simulation doesn't model ----
    if (b.flash > this.prevFlash) this.kickV += 120 * (x < p.x ? -1 : 1);
    this.prevFlash = b.flash;
    if (b.phase > this.prevPhase) this.rage = 1;
    this.prevPhase = b.phase;
    this.rage = Math.max(0, this.rage - dt / RAGE);
    this.kickV += (-this.kick * 260 - this.kickV * 16) * dt;
    this.kick += this.kickV * dt;
    this.landedT = Math.max(0, this.landedT - dt);
    if (b.airborne && !this.wasAir) {
      this.sq = 0.22;
      this.sqV = -7; // he stretches up as he leaves the ground
      this.airT = 0;
      this.fx.burst(x, GROUND, { ...DUST, n: 8, speed: 130, color: '#cfc6e6' });
    }
    if (!b.airborne && this.wasAir) {
      this.sqV = 9;
      this.landedT = LANDED;
    }
    this.wasAir = b.airborne;
    this.airT += dt;
    this.sqV += (-this.sq * 320 - this.sqV * 18) * dt;
    this.sq += this.sqV * dt;
    this.capLag += (vy * 0.018 - this.capLag) * Math.min(1, dt * 12);
    this.lean += (clamp(-vx * 0.022, -14, 14) - this.lean) * Math.min(1, dt * 10);
    const crouching = b.attackName === 'bigHop' && b.telegraph > 0 && b.telegraph < CROUCH,
      crouch = crouching ? (1 - b.telegraph / CROUCH) * 0.22 : 0,
      bounce = Math.sin(b.spring.sprung * Math.PI) * 0.2,
      sq = this.sq + crouch + bounce;

    // a sigh, now and then, while he sulks in his first mood
    const sulking = b.alive && b.state === 'fight' && !b.attacking && phase === 0;
    this.sighT -= dt;
    if (this.sighT <= 0) {
      this.sighT = 4 + Math.random() * 2;
      if (sulking) {
        this.sigh = 1;
        this.fx.burst(x + 2, feet - 22, {
          n: 1,
          shape: 'puff',
          color: '#cdb8ff',
          speed: 34,
          dir: UP,
          spread: 0.5,
          gravity: -30,
          life: 0.8,
          size: 7,
          alpha: 0.7,
        });
      }
    }
    this.sigh = Math.max(0, this.sigh - dt / 0.8);

    // ---- what he is doing: the first of these that matches ----
    const named = (['shout', 'cross', 'furious'] as const)[phase],
      posed = this.posed(b);
    let face: MoFace, arms: Arms;
    if (!b.alive) [face, arms] = ['joy', 'up'];
    else if (asleep) [face, arms] = ['sleepy', 'droop'];
    else if (roaring) [face, arms] = ['shout', 'up'];
    else if (b.dizzy > 0) [face, arms] = ['dizzy', 'droop'];
    else if (b.flash > 0 && b.faceOpen) [face, arms] = ['ouch', posed];
    else if (this.rage > 0.3) [face, arms] = [named === 'shout' ? 'cross' : named, 'flail'];
    else if (this.landedT > 0) [face, arms] = ['ouch', 'out'];
    else if (b.open || b.airborne) [face, arms] = [named, posed];
    else [face, arms] = [(['sulk', 'cross', 'cross'] as const)[phase], 'droop'];

    // ---- his shape, measured up from his feet. What the simulation says, but for the poses that are only for show ----
    const dizzyRear = Math.min(b.rear, 0.72),
      shown = !b.alive ? 0.9 : roaring || this.rage > 0.3 ? 1 : null;
    this.pose += ((shown === null ? 0 : 1) - this.pose) * Math.min(1, dt * 11);
    const breath = Math.sin(clock * (asleep ? 0.9 : 1.6)) * (asleep ? 0.022 : 0.012),
      rear = lerp(b.dizzy > 0 ? dizzyRear : b.rear, shown ?? 1, this.pose),
      capH =
        lerp(CAP_LOW, CAP_HIGH, rear) * (1 - sq * 0.75) * (1 + breath) +
        this.capLag -
        Math.sin(this.sigh * Math.PI) * 4,
      faceH = capH - lerp(46, 63, rear);

    if (b.spinning) this.spin(x, dt, vx);
    else if (this.whirl.visible) this.stopSpin();
    this.syncDizzy(b, x, feet, capH, faceH, t, dt);

    // ---- all of him ----
    const tremble =
        this.rage * 3 + (roaring ? 3 : 0) + (b.alive && b.state === 'fight' && phase === 2 ? 0.6 : 0),
      hop = !b.alive ? Math.abs(Math.sin(clock * 7.5)) * 14 : 0;
    this.rig
      .setPosition(x + rand(-tremble, tremble), feet - hop + rand(-tremble, tremble))
      .setScale(1 + sq * 0.42, 1)
      .setRotation(
        b.spinning
          ? Math.sign(vx) * WHIRL_LEAN
          : (b.dizzy > 0 ? 0.05 + Math.sin(t * 3.4) * 0.012 : 0) + this.lean * 0.004,
      );

    // the top of him: his cap takes the whole of a hit and his stalk's top half of it
    const lean = this.lean + this.kick,
      wobble = Math.sin(b.spring.sprung * 20) * 0.03 * b.spring.sprung,
      capTilt =
        (b.dizzy > 0
          ? 0.2 + Math.sin(t * 7) * 0.12
          : !b.alive
            ? Math.sin(clock * 7.5) * 0.05
            : Math.sin(t * 1.5) * 0.015) +
        this.kick * 0.004 +
        wobble,
      swell = 1 + b.puff * 0.08 + this.rage * 0.05,
      capX = (image: GameObjects.Image) => image.setPosition(lean, -capH).setRotation(capTilt);

    capX(this.gills)
      .setVisible(rear > 0.25)
      .setAlpha(clamp((rear - 0.25) / 0.12, 0, 1));
    const stalkLean = this.lean + this.kick * 0.5,
      top = capH - 6,
      span = top - STALK_FOOT;
    for (let i = 0; i < STALK_POINTS; i++) {
      const u = i / (STALK_POINTS - 1);
      this.stalk.set(i, stalkLean * u * u, -(STALK_FOOT + span * u));
    }
    this.stalk.bend();
    this.skirt
      .setPosition(stalkLean * 0.9, -capH + 42)
      .setVisible(rear > 0.4)
      .setAlpha(clamp((rear - 0.4) / 0.1, 0, 1));

    // ---- his arms ----
    const armY = -Math.max(30, faceH - 44),
      wave = !b.alive ? Math.sin(clock * 9) * 0.14 : 0;
    this.armAngle += (ARMS[arms] - this.armAngle) * Math.min(1, dt * 14);
    this.arms.forEach((arm, i) => {
      const side = i ? 1 : -1,
        flail = arms === 'flail' ? Math.sin(clock * 22 + i * 2) * 0.25 : 0;
      arm.setPosition(side * SHOULDER, armY).setRotation(side * (this.armAngle + flail + wave));
    });

    // ---- his face, and his eyes watching Pip from under the brim ----
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2.2 + Math.random() * 2.8;
    const faceX = stalkLean * 0.6,
      open = eyesOpen(face),
      blink = open && this.blink < 0,
      seeing = open && !blink;
    show(this.face, moFaceKey(face, blink));
    this.face.setPosition(faceX, -faceH);
    this.eyes
      .setVisible(seeing)
      .setPosition(faceX, -faceH)
      .setTint(face === 'furious' ? FURIOUS_EYE : 0xffffff);
    this.look += (clamp((p.x - x) / 200, -1, 1) - this.look) * Math.min(1, dt * 10);
    this.pupils.forEach((pupil, i) =>
      pupil
        .setVisible(seeing)
        .setPosition(faceX + (i ? 1 : -1) * EYE_X + this.look * LOOK, -faceH + EYE_Y + PUPIL_DOWN)
        .setScale(INV * pupilSize(face)),
    );

    // ---- his cap, turning a new colour if his mood has changed ----
    const set = b.alive ? phase : 3;
    if (set !== this.set) {
      show(this.capWas, `mo-cap-${this.set}`);
      this.set = set;
      this.capFade = 0;
    }
    this.capFade = Math.min(1, this.capFade + dt / CAP_FADE);
    show(this.cap, `mo-cap-${set}`);
    show(this.capGlow, `mo-cap-glow-${set}`);
    const capScaleX = INV * swell,
      capScaleY = INV * swell * (1 - sq * 0.25);
    capX(this.capWas)
      .setVisible(this.capFade < 1)
      .setScale(capScaleX, capScaleY);
    capX(this.cap).setAlpha(this.capFade).setScale(capScaleX, capScaleY);
    const pulse = !b.alive ? 1 : set === 2 ? 0.9 + Math.sin(t * 1.6) * 0.1 : 0.5 + Math.sin(t * 1.6) * 0.15;
    capX(this.capGlow)
      .setAlpha(pulse)
      .setScale(this.units.glow * swell, this.units.glow * swell * (1 - sq * 0.25));

    // ---- once he is cheered up, golden spores rise from him ----
    if (b.alive) this.spores = SPORES;
    else if (this.spores > 0) {
      this.spores -= dt;
      this.sporeT -= dt;
      if (this.sporeT <= 0) {
        this.sporeT = 0.3;
        this.fx.burst(x, feet - capH, {
          n: 4,
          shape: 'star',
          colors: ['#fff0a0', '#ffc53f', '#fffcdc'],
          speed: 90,
          size: 7,
          life: 1.2,
          gravity: -70,
          glow: true,
          radius: 70,
        });
      }
    }

    // ---- light and shadow on the ground under him ----
    const height = GROUND - feet + hop,
      air = clamp(height / 110, 0, 1),
      tumbling = b.airborne && b.landX !== null;
    this.pool
      .setPosition(x, GROUND + 2)
      .setTint(hex(MO_PALETTE.caps[set].glow))
      .setAlpha(0.35 * (1 - air))
      .setScale(this.units.pool);
    // in a hop, his shadow is where he will come down, and grows until he does
    const grow = tumbling ? clamp(this.airT / 0.8, 0, 1) : 1 - air * 0.7;
    this.shadow
      .setPosition(tumbling ? (b.landX ?? x) : x, GROUND + 3)
      .setScale(this.units.shadow * (0.35 + 0.65 * grow), this.units.shadow * (0.35 + 0.65 * grow))
      .setAlpha(tumbling ? 0.35 + 0.65 * grow : 1);

    // ---- warnings ----
    const warning = b.telegraph > 0;
    this.warnT = warning ? this.warnT + dt : 0;
    if (warning) showMark(this.mark, x, feet - capH - 84, this.warnT);
    else this.mark.setVisible(false);
    const landing = b.landX !== null;
    this.ring.setVisible(landing);
    if (landing) {
      this.ring
        .setPosition(b.landX ?? 0, GROUND + 1)
        .setScale(INV * 3.1, INV * 2.6)
        .setAlpha(0.7 + Math.sin(b.t * 16) * 0.25);
      if (warning) showMark(this.ringMark, b.landX ?? 0, GROUND - 40, this.warnT);
      else this.ringMark.setVisible(false);
    } else this.ringMark.setVisible(false);
    this.showHit(b.flash > 0);
  }

  private reset(b: Mo) {
    this.seen = b;
    this.sq = this.sqV = this.capLag = this.lean = this.kick = this.kickV = this.rage = this.pose = 0;
    this.prevFlash = this.landedT = this.sigh = this.warnT = 0;
    this.prevPhase = b.phase;
    this.wasAir = false;
    this.lastX = b.x;
    this.slide = 0;
    this.set = Math.min(b.phase, 3) - 1;
    this.capFade = 1;
    this.armAngle = ARMS.droop;
  }

  // Not a cap sliding along but a spinning top, seen from the side: a flip-book, with arcs of air round it.
  private spin(x: number, dt: number, vx: number) {
    if (!this.whirl.visible) {
      this.body.setVisible(false);
      this.whirl.setVisible(true);
      this.hazeX = x;
      for (const arc of this.arcs) arc.setVisible(true);
    }
    const frame = Math.floor(this.clock * WHIRL_FPS) % WHIRL_FRAMES;
    show(this.whirl, `mo-whirl-${frame}`);
    this.arcs.forEach((arc, i) => {
      show(arc, `mo-whirl-arc-${(frame + i * 2) % WHIRL_FRAMES}`);
      arc
        .setPosition(0, (-96 + i * 38) * WHIRL_SCALE)
        .setScale(((112 - i * 8) / 112) * this.units.arc * WHIRL_SCALE, this.units.arc * WHIRL_SCALE);
    });
    if (Math.abs(x - this.hazeX) >= WHIRL_HAZE) {
      this.hazeX = x;
      this.trail.drop(x - Math.sign(vx) * 40, GROUND - 16);
    }
    this.dustT -= dt;
    if (this.dustT <= 0) {
      this.dustT = 0.05;
      this.fx.burst(x, GROUND, { ...DUST, n: 1, speed: 90 });
    }
  }

  private stopSpin() {
    this.whirl.setVisible(false);
    for (const arc of this.arcs) arc.setVisible(false);
    this.body.setVisible(true);
  }

  // The fight's big opening: stars round his cap, and two sparkles beside his face to say "hit me" without a word.
  private syncDizzy(b: Mo, x: number, feet: number, capH: number, faceH: number, t: number, dt: number) {
    const dizzy = b.dizzy > 0;
    this.stars.forEach((star, i) => {
      star.setVisible(dizzy);
      if (dizzy) {
        const a = t * 5 + (i * TAU) / 3;
        star.setPosition(x + Math.cos(a) * 92, feet - capH - 96 + Math.sin(a) * 15).setRotation(a);
      }
    });
    if (!dizzy) return;
    this.sparkT -= dt;
    if (this.sparkT <= 0) {
      this.sparkT = 0.32;
      this.sparkSide = -this.sparkSide;
      this.fx.burst(x + this.sparkSide * 60, feet - faceH - 6, {
        n: 1,
        shape: 'star',
        color: '#fff6b8',
        speed: 6,
        size: 9,
        life: 0.42,
        gravity: 0,
        glow: true,
      });
    }
  }

  // How he throws his arms about when he is up to something, by how cross he is.
  private posed(b: Mo): Arms {
    return b.airborne ? 'flail' : (['up', 'out', 'flail'] as const)[Math.min(b.phase, 3) - 1];
  }

  private showHit(hit: boolean) {
    if (hit === this.lit) return;
    this.lit = hit;
    const parts = [this.cap, this.capWas, this.foot, this.skirt, this.gills, ...this.arms];
    for (const image of parts)
      if (hit) image.setTint(HIT_LIGHT).setTintMode(TintModes.ADD);
      else image.clearTint();
    this.stalk.rope
      .setTintMode(hit ? TintModes.ADD : TintModes.MULTIPLY)
      .setColors(hit ? HIT_LIGHT : 0xffffff);
  }
}
