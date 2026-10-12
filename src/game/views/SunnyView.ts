// Sunny the Grumpy Sunflower. His parts are baked in sunny/art.ts and sunny/face.ts; this file moves them.
// The simulation says where his head is, what phase he is in and when he attacks or gets hit. Everything
// else here is acting: the recoil when a seed lands, the wind-up before an attack, the tantrum when he
// changes phase, the eyes that follow Pip, and the pinwheel of petals once he has cheered up.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, TAU } from '../../config';
import type { Boss } from '../../sim/boss';
import type { Sunny } from '../../sim/bosses/sunny';
import type { Fight } from '../../sim/fight';
import { lerp, qbez } from '../../sim/math';
import { INV, part, Ribbon, show, unit } from '../art/bake';
import type { FxTarget } from '../presenter';
import type { BossView } from './bossViews';
import { bakeSunny, HEAD_R, PETAL_KEYS, STEM_HALF } from './sunny/art';
import { EYE, eyesKey, eyesOpen, sunnyFaceKey, type SunnyFace } from './sunny/face';

export { bakeSunny };

const PETALS = 16; // in each of the two rings
const PETAL_ROOT = HEAD_R - 14; // petals start a little inside the rim of the disc
const STEM_STEPS = 18;
const STEM_LEAVES = [
  [0.3, -1],
  [0.47, 1],
] as const; // [how far up the stem, which side]
const UP = -Math.PI / 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOutBack = (u: number) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);

export class SunnyView implements BossView {
  private all: GameObjects.Container;
  private halo: GameObjects.Image;
  private haloUnit: number; // the halo is baked small: this is the scale that shows it at full size
  private stem: Ribbon;
  private soil: GameObjects.Image;
  private leaves: GameObjects.Image[];
  private head: GameObjects.Container;
  private back: GameObjects.Image[] = [];
  private front: GameObjects.Image[] = [];
  private eyes: GameObjects.Image;
  private pupils: GameObjects.Image[];
  private face: GameObjects.Image;
  private flash: GameObjects.Image;
  private vein: GameObjects.Image;
  private snore: GameObjects.Image;
  private warn: GameObjects.Image;
  private zzz: GameObjects.Image[];

  private seen: Boss | null = null;
  private blink = 1 + Math.random() * 3;
  private kick = 0; // how far the last hit has knocked his head back
  private kickV = 0;
  private ripple = 0; // a shiver through the petals after a hit
  private rage = 0; // 1 -> 0 during the tantrum at each new phase
  private prevFlash = 0;
  private prevPhase = 1;
  private warnT = 0; // seconds the "!" has been showing
  private spin = 0;
  private lookX = 0;
  private lookY = 0;
  private steamT = 0;
  private sparkT = 0;

  constructor(
    scene: Scene,
    depth: number,
    private fx: FxTarget,
  ) {
    this.halo = part(scene, 'sunny-halo').setBlendMode(BlendModes.ADD);
    this.haloUnit = unit('sunny-halo');
    this.stem = new Ribbon(scene, 'sunny-stem', STEM_STEPS + 1);
    this.leaves = STEM_LEAVES.map(([, side]) => part(scene, 'sunny-leaf').setScale(side * INV, INV));
    this.soil = part(scene, 'sunny-soil');
    for (let i = 0; i < PETALS; i++) {
      this.back.push(part(scene, 'sunny-petal-back-0'));
      this.front.push(part(scene, 'sunny-petal-front-0'));
    }
    this.eyes = part(scene, eyesKey('grumpy1'));
    this.pupils = [-1, 1].map(() => part(scene, 'sunny-pupil'));
    this.face = part(scene, sunnyFaceKey('sleep'));
    this.flash = part(scene, 'sunny-flash').setVisible(false);
    this.vein = part(scene, 'sunny-vein', 37, -42).setVisible(false);
    this.snore = part(scene, 'sunny-bubble', 4, 30).setVisible(false);
    this.head = scene.add.container(0, 0, [
      ...this.back,
      ...this.front,
      part(scene, 'sunny-disc'),
      this.eyes,
      ...this.pupils,
      this.face,
      this.flash,
      this.vein,
      this.snore,
    ]);
    this.warn = part(scene, 'warn-bubble').setVisible(false);
    this.zzz = [0, 1, 2].map(() => part(scene, 'zzz').setVisible(false));
    // one container keeps the draw order: glow, stem, leaves, soil, head, then the signs on top
    this.all = scene.add
      .container(0, 0, [
        this.halo,
        this.stem.rope,
        ...this.leaves,
        this.soil,
        this.head,
        this.warn,
        ...this.zzz,
      ])
      .setDepth(depth);
  }

  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }

  sync(fight: Fight, alpha: number, dt: number) {
    const b = fight.boss as Sunny,
      p = fight.player;
    if (b !== this.seen) this.reset(b); // a new fight
    this.blink -= dt;
    if (this.blink < -0.13) this.blink = 2.2 + Math.random() * 3;

    const x = lerp(b.px, b.x, alpha),
      y = lerp(b.py, b.y, alpha),
      t = b.t;
    const asleep = b.state === 'sleep' || (b.state === 'intro' && b.introT < 0.9);
    const roar = b.state === 'intro' && b.introT >= 0.9 ? Math.max(0, 1 - (b.introT - 0.9) / 0.8) : 0;
    const fighting = b.alive && b.state === 'fight';
    const happy = b.happy;

    // ---- reactions the simulation doesn't model ----
    if (b.flash > this.prevFlash) {
      this.kickV += 150;
      this.ripple = 1;
    }
    this.prevFlash = b.flash;
    if (b.phase > this.prevPhase) this.rage = 1;
    this.prevPhase = b.phase;
    this.kickV += (-this.kick * 260 - this.kickV * 16) * dt; // a spring pulls the head back into place
    this.kick += this.kickV * dt;
    this.ripple = Math.max(0, this.ripple - dt * 4);
    this.rage = Math.max(0, this.rage - dt / 1.3);
    this.warnT = b.telegraph > 0 ? this.warnT + dt : 0;
    const windup = Math.min(1, this.warnT / 0.45); // 0 -> 1 as he draws breath for an attack
    const tremble = this.rage * 3.2 + roar * 3 + (fighting && b.phase === 3 ? 0.6 : 0);

    const hx = x + this.kick + windup * 6 + rand(-tremble, tremble),
      hy = y - windup * 4 + rand(-tremble, tremble);

    // ---- stem: a tapering ribbon from the soil to just under the head ----
    const x0 = b.baseX,
      y0 = GROUND + 6,
      cx = b.baseX + (hx - b.baseX) * 0.3,
      cy = (GROUND + hy) / 2 + 30,
      y1 = hy + 34;
    for (let i = 0; i <= STEM_STEPS; i++) {
      const u = i / STEM_STEPS;
      this.stem.set(i, qbez(x0, cx, hx, u), qbez(y0, cy, y1, u));
    }
    this.stem.bend();
    this.soil.setPosition(b.baseX, GROUND + 3);

    // ---- leaves: he uses them like arms ----
    const raise = windup * 0.55 + b.puff * 0.5 + roar * 0.7 + this.rage * 0.6,
      rest = asleep ? 0.3 : -0.85;
    for (let i = 0; i < STEM_LEAVES.length; i++) {
      const [up, side] = STEM_LEAVES[i],
        u = Math.round(up * STEM_STEPS) / STEM_STEPS, // a leaf sprouts from one of the stem's points
        wave = happy * Math.sin(t * 7 + i * Math.PI) * 0.4;
      this.leaves[i]
        .setPosition(
          qbez(x0, cx, hx, u) + side * lerp(STEM_HALF[0], STEM_HALF[1], u) * 0.6,
          qbez(y0, cy, y1, u),
        )
        .setRotation(side * (rest - raise + wave + Math.sin(t * 1.6 + up * 5) * 0.1));
    }

    // ---- head ----
    const tilt = asleep
      ? 0.17 + Math.sin(t * 0.8) * 0.03
      : Math.sin(t * 1.3) * 0.05 +
        windup * 0.1 -
        b.puff * 0.12 +
        this.kick * 0.01 +
        happy * Math.sin(t * 3) * 0.06;
    const breath = asleep ? Math.sin(t * 1.6) * 0.012 : 0;
    this.head
      .setPosition(hx, hy)
      .setRotation(tilt)
      .setScale(1 + b.puff * 0.08 + this.rage * 0.07 + roar * 0.1 + (b.flash > 0 ? 0.025 : 0) + breath);

    const set = b.alive ? b.phase - 1 : 3;
    const gathering = b.attackName === 'petalFan' || b.attackName === 'pollenRain' ? 0.2 : 0.08;
    const flare =
      b.puff * 0.24 + roar * 0.3 + this.rage * 0.26 + happy * 0.2 + windup * gathering - (asleep ? 0.13 : 0);
    this.spin += dt * happy * 0.5; // a happy sunflower turns like a pinwheel
    const backKey = PETAL_KEYS.back[set],
      frontKey = PETAL_KEYS.front[set];
    for (let i = 0; i < PETALS; i++) {
      this.petal(this.back[i], backKey, (i + 0.5) / PETALS, 1, flare, asleep, t);
      this.petal(this.front[i], frontKey, i / PETALS, 0, flare, asleep, t);
    }

    // ---- face ----
    const face: SunnyFace =
      b.flash > 0 && b.alive
        ? 'ouch'
        : asleep
          ? 'sleep'
          : !b.alive
            ? 'happy'
            : roar > 0 || this.rage > 0.25
              ? 'shout'
              : b.telegraph > 0
                ? 'puff'
                : fighting && b.attacking
                  ? 'shout'
                  : (`grumpy${b.phase}` as SunnyFace);
    const open = eyesOpen(face),
      blink = open && this.blink < 0;
    show(this.face, sunnyFaceKey(face, blink));
    this.eyes.setVisible(open && !blink);
    if (open) show(this.eyes, eyesKey(face));
    // the pupils follow Pip
    const lx = lerp(p.px, p.x, alpha) - hx,
      ly = p.y - 26 - hy,
      far = Math.hypot(lx, ly) || 1,
      ease = Math.min(1, dt * 10);
    this.lookX += ((lx / far) * 4.4 - this.lookX) * ease;
    this.lookY += ((ly / far) * 3.2 - this.lookY) * ease;
    const pupil = face === 'puff' ? 0.76 : face === 'happy' ? 1.12 : face === 'shout' ? 0.9 : 1;
    this.pupils.forEach((img, i) =>
      img
        .setVisible(open && !blink)
        .setPosition((i ? 1 : -1) * EYE.x + this.lookX, EYE.y + 1.5 + this.lookY)
        .setScale(INV * pupil),
    );
    this.flash.setVisible(b.flash > 0).setAlpha((b.flash / 0.12) * 0.55);
    this.vein
      .setVisible(fighting && b.phase === 3)
      .setScale(INV * (1 + Math.sin(t * 9) * 0.16))
      .setRotation(Math.sin(t * 5) * 0.12);
    this.snore.setVisible(b.state === 'sleep').setScale(INV * (0.45 + 0.3 * (1 + Math.sin(t * 1.6))));

    // ---- signs around him ----
    this.halo
      .setPosition(hx, hy)
      .setAlpha(Math.min(1, 0.14 + happy * 0.55 + windup * 0.12))
      .setScale(this.haloUnit * (0.62 + happy * 0.5 + Math.sin(t * 2) * 0.02));
    const warning = b.telegraph > 0;
    this.warn
      .setVisible(warning)
      .setPosition(hx - 86, hy - 98 - Math.abs(Math.sin(t * 10)) * 5)
      .setScale(INV * (warning ? easeOutBack(Math.min(1, this.warnT / 0.2)) : 0))
      .setRotation(Math.sin(t * 18) * 0.07);
    this.zzz.forEach((z, i) => {
      const u = (t * 0.45 + i / 3) % 1; // each z drifts up and away, growing as it goes
      z.setVisible(asleep)
        .setPosition(hx + 64 + u * 46, hy - 58 - u * 56)
        .setScale(INV * (0.55 + u * 0.75))
        .setAlpha(Math.sin(u * Math.PI));
    });

    // ---- steam when he is fuming, sparkles and hearts once he is happy ----
    if (fighting && b.phase > 1) {
      this.steamT -= dt;
      if (this.steamT <= 0) {
        this.steamT = b.phase === 3 ? 0.3 : 0.8;
        const side = Math.random() < 0.5 ? -1 : 1;
        this.fx.burst(hx + side * 52, hy - 46, {
          n: 1,
          shape: 'puff',
          color: '#ffffff',
          speed: 46,
          dir: UP + side * 0.5,
          spread: 0.5,
          gravity: -70,
          life: 0.75,
          size: 8,
          alpha: 0.75,
        });
      }
    }
    if (happy > 0) {
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.11;
        const heart = Math.random() < 0.22;
        this.fx.burst(hx + rand(-120, 120), hy + rand(-120, 110), {
          n: 1,
          shape: heart ? 'heart' : 'star',
          color: heart ? '#ff8fb1' : '#fff6b8',
          speed: 24,
          dir: UP,
          spread: 1,
          gravity: -40,
          life: heart ? 1.1 : 0.7,
          size: heart ? 6 : 7,
          glow: !heart,
        });
      }
    }
  }

  private reset(b: Boss) {
    this.seen = b;
    this.kick = this.kickV = this.ripple = this.rage = this.spin = this.warnT = 0;
    this.prevFlash = 0;
    this.prevPhase = b.phase;
  }

  private petal(
    img: GameObjects.Image,
    key: string,
    turn: number,
    ring: number,
    flare: number,
    asleep: boolean,
    t: number,
  ) {
    const a = turn * TAU + this.spin + Math.sin(t * 2 + turn * 20) * 0.03;
    const wave =
      Math.sin(t * 3 + turn * 12 + ring) * 0.03 + this.ripple * 0.09 * Math.sin(turn * 30 + this.ripple * 10);
    const sag = asleep ? Math.cos(a) * 0.2 : 0; // sleeping petals droop
    // petals facing the sun (up and to the left) are a touch brighter than those facing away
    const lit = 0.9 - 0.0707 * (Math.cos(a) + Math.sin(a)) - ring * 0.05,
      v = Math.round(255 * Math.min(1, lit));
    show(img, key);
    img
      .setPosition(Math.cos(a) * PETAL_ROOT, Math.sin(a) * PETAL_ROOT)
      .setRotation(a + sag)
      .setScale(INV * (1 + flare + wave), INV * (1 + flare * 0.25))
      .setTint((v << 16) | (v << 8) | v);
  }
}
