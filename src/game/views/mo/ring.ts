// The Fairy Ring: mushrooms really do grow in rings, spreading through threads of mycelium under the soil, and they
// really do let out clouds of spores. So a pale root creeps through the soil after Pip, tiny toadstools pop up around
// him under the "!", and the ring erupts straight up. It warns on the ground at his feet, where the player is looking.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, TAU, UP } from '../../../config';
import { RING_ERUPT, RING_WARN, type FairyRing, type Hazard } from '../../../sim/hazards';
import { clamp, lerp } from '../../../sim/math';
import { bake, INV, part, Ribbon, SOFT, unit } from '../../art/bake';
import { rgba } from '../../art/color';
import { circle, glow, inside, line, linear, radial, seeded, type Ctx } from '../../art/draw';
import { easeOutBack, rand } from '../../motion';
import type { FxTarget } from '../../presenter';
import { showMark } from '../marks';
import { MO_PALETTE } from './art';
import type { AcidTrail } from './smoke';

const INK = MO_PALETTE.ink;
const GAS = MO_PALETTE.gas;
const ACID = { deep: '#2b9440', mid: '#6cc638', lit: '#b6e84c', hi: '#ecfca0' };
const TOP = 118; // how high the column's art goes; it meets the top of what hurts (y 110) under its plume
const JET_H = 300; // the column's art repeats every this many pixels as it scrolls up
const JET_W = 72;
const JET_SPEED = 900;
const ROOT_LEN = 512; // the root's strip
const ROOT_POINTS = 14;
const ROOT_DEEP = 8; // it runs this far below the ground line, on the soil
const ROOT_REACH = 0.35; // seconds it takes to get from Mo to where it starts following Pip
const AFTER = 0.4; // seconds the plume drifts and the root fades, once it has stopped hurting
const SPOT_R = 29; // half the width of the orange ring in its part
const SPOT_WIDE = 62; // how wide it grows, each way
const BEAM_W = 44; // the width of the beam's part
const POP_GAP = 0.05, // the toadstools pop up one after another...
  POP = 0.18; // ...each taking this long

// Around the ellipse, back ones first: [across, back or front, height]. v < 0 is behind Pip.
const SHROOMS = [
  [-0.6, -1, 21],
  [0.15, -1, 24],
  [0.72, -0.85, 20],
  [-0.98, -0.2, 24],
  [0.98, -0.1, 22],
  [-0.72, 0.8, 27],
  [-0.05, 1, 30],
  [0.68, 0.85, 25],
] as const;

// A tiny toadstool of the ring, standing on (0, 0).
function drawShroom(c: Ctx, h: number) {
  const w = h * 0.86;
  c.beginPath();
  c.moveTo(-w * 0.2, 0);
  c.quadraticCurveTo(-w * 0.14, -h * 0.34, -w * 0.13, -h * 0.62);
  c.lineTo(w * 0.13, -h * 0.62);
  c.quadraticCurveTo(w * 0.14, -h * 0.34, w * 0.2, 0);
  c.quadraticCurveTo(0, h * 0.09, -w * 0.2, 0);
  c.closePath();
  c.fillStyle = linear(c, -w * 0.2, 0, w * 0.2, 0, ['#fff4da', '#e8cfae', '#b08ea0']);
  c.fill();
  line(c, INK, 1.9);
  const cap = () => {
    c.beginPath();
    c.moveTo(-w / 2, -h * 0.52);
    c.bezierCurveTo(-w / 2, -h * 1.06, w / 2, -h * 1.06, w / 2, -h * 0.52);
    c.quadraticCurveTo(0, -h * 0.4, -w / 2, -h * 0.52);
    c.closePath();
  };
  cap();
  c.fillStyle = radial(
    c,
    0,
    -h * 0.68,
    w * 0.62,
    [ACID.hi, ACID.lit, ACID.mid, ACID.deep],
    -w * 0.16,
    -h * 0.84,
  );
  c.fill();
  inside(c, cap, () => {
    for (const [x, y, r] of [
      [-w * 0.2, -h * 0.72, w * 0.09],
      [w * 0.14, -h * 0.82, w * 0.07],
      [w * 0.26, -h * 0.62, w * 0.05],
    ]) {
      circle(c, x, y, r);
      c.fillStyle = '#fbffd8';
      c.fill();
    }
  });
  cap();
  line(c, INK, 2);
}

// The mycelium, as a strip for a Ribbon: pale root through the soil, thick at the head at x = 0 and tapering back
// toward Mo. Rootlets only ever go down into the soil, so nothing crosses the turf.
function drawRoot(c: Ctx) {
  const rand = seeded(12),
    pts: [number, number][] = [];
  for (let x = 0; x <= ROOT_LEN; x += 26)
    pts.push([x, -2 + Math.sin(x * 0.03 + 12) * 2 + (rand() - 0.5) * 2]);
  const stroke = (color: string, width: number, alpha: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const u = i / Math.max(1, pts.length - 1),
        [x0, y0] = pts[i],
        [x1, y1] = pts[i + 1];
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + (i % 2 ? 1.5 : -1.5), x1, y1);
      line(c, color, width * (1 - u * 0.65), alpha);
    }
  };
  stroke(ACID.lit, 3, 1);
  stroke(ACID.hi, 1.2, 0.9);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i],
      side = i % 2 ? 1 : -1,
      len = 7 + rand() * 11;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + side * len * 0.8, y + 1, x + side * len, y + 3 + rand() * 6);
    line(c, ACID.lit, 1.3, 0.5);
  }
}

// One piece of the eruption's column, that repeats top to bottom as it scrolls: whole periods over its height.
function drawJet(c: Ctx) {
  const k = TAU / JET_H,
    half = JET_W / 2 - 4,
    wave = (y: number, a: number) => Math.sin(y * k * 2 + a) * 2.6 + Math.sin(y * k * 5 + a * 2) * 1.2,
    side = (dir: number, grow: number, y: number) => dir * (half - 4 + grow + wave(y, dir)),
    column = (grow: number) => {
      c.beginPath();
      c.moveTo(side(-1, grow, 0), 0);
      for (let y = 6; y <= JET_H; y += 6) c.lineTo(side(-1, grow, y), y);
      for (let y = JET_H; y >= 0; y -= 6) c.lineTo(side(1, grow, y), y);
      c.closePath();
    };
  column(3);
  c.fillStyle = GAS.rim;
  c.fill();
  column(0);
  c.fillStyle = linear(c, -half, 0, half, 0, [
    [0, GAS.mid],
    [0.22, GAS.body],
    [0.5, GAS.hot],
    [0.78, GAS.body],
    [1, GAS.mid],
  ]);
  c.fill();
  inside(
    c,
    () => column(0),
    () => {
      // streaks of speed, drawn twice a height apart so that they wrap
      const rand = seeded(11);
      for (let i = 0; i < 18; i++) {
        const x = (rand() - 0.5) * half * 1.7,
          y0 = rand() * JET_H,
          len = 24 + rand() * 46,
          white = i % 3 !== 0;
        for (const off of [0, -JET_H, JET_H]) {
          c.beginPath();
          c.moveTo(x, y0 + off);
          c.lineTo(x + Math.sin(y0) * 2, y0 + off - len);
          line(c, white ? '#ffffff' : GAS.mid, white ? 2 : 2.6, white ? 0.55 : 0.5);
        }
      }
    },
  );
}

export function bakeRing(scene: Scene) {
  SHROOM_SIZES.forEach((h, i) => bake(scene, `ring-shroom-${i}`, 36, 38, 18, 34, (c) => drawShroom(c, h)));
  bake(scene, 'ring-jet', JET_W, JET_H, JET_W / 2, 0, drawJet);
  bake(scene, 'myc-root', ROOT_LEN, 24, 0, 8, drawRoot, SOFT);
  bake(
    scene,
    'myc-head',
    80,
    32,
    40,
    16,
    (c) => {
      glow(c, 0, 0, 38, ACID.lit, 0.7, 14);
      glow(c, 0, 0, 14, ACID.hi, 0.9, 6);
    },
    SOFT,
  );
  bake(scene, 'ring-foot-glow', 130, 40, 65, 20, (c) => glow(c, 0, 0, 63, ACID.lit, 0.6, 18), SOFT);
  // the faint glow all down the column, soft at the sides and thin at both ends
  bake(
    scene,
    'ring-halo',
    132,
    90,
    66,
    45,
    (c) => {
      c.fillStyle = linear(c, -66, 0, 66, 0, [rgba(GAS.body, 0), rgba(GAS.body, 0.28), rgba(GAS.body, 0)]);
      c.fillRect(-66, -45, 132, 90);
    },
    SOFT,
  );
}

const SHROOM_SIZES = [21, 25, 30] as const;
const shroomSet = (h: number) => (h < 23 ? 0 : h < 28 ? 1 : 2);

// [x, y, half its width, half its height, alpha], around the top of the column
const PLUME_BACK = [
  [-62, 136, 34, 20, 0.6],
  [62, 134, 34, 20, 0.6],
  [-32, 106, 42, 30, 0.75],
  [32, 102, 42, 30, 0.75],
  [0, 84, 40, 28, 0.7],
] as const;
const PLUME_MID = [
  [-52, 132, 28, 16, 0.85],
  [52, 130, 28, 16, 0.85],
  [-24, 112, 32, 22, 0.95],
  [24, 108, 32, 22, 0.95],
  [0, 94, 28, 20, 0.95],
] as const;
const PLUME_TOP = [
  [-18, 122, 26, 15],
  [18, 120, 26, 15],
  [0, 114, 24, 15],
] as const;
const FOOT = [
  [-34, GROUND - 8, 24, 13],
  [34, GROUND - 8, 24, 13],
  [0, GROUND - 12, 30, 15],
] as const;
const PLUME_CURLS = [
  [-34, 110, 9.5],
  [30, 104, 8.5],
  [0, 92, 7],
] as const;
const PLUME_WISPS = [
  [-20, 74, 22],
  [30, 80, 20],
] as const;

interface Toadstool {
  image: GameObjects.Image;
  u: number;
  v: number;
  scale: number;
}

export class RingView {
  // ---- the root ----
  private root: Ribbon;
  private head: GameObjects.Image;
  private mound: GameObjects.Image;
  private rootAlphas: number[];
  // ---- the warning ----
  private spot: GameObjects.Image;
  private beam: GameObjects.Image;
  private mark: GameObjects.Image;
  private toadstools: Toadstool[] = [];
  // ---- the eruption ----
  private column: GameObjects.TileSprite;
  private halo: GameObjects.Image;
  private plume: GameObjects.Container;
  private plumeTop: GameObjects.Container;
  private foot: GameObjects.Container;
  private footGlow: GameObjects.Image;

  private live = false;
  private tipX = 0; // the root's head
  private fromX = 0; // Mo's end of it
  private seekT = 0;
  private warnT = 0;
  private eruptT = 0;
  private after = 0;
  private clodT = 0;
  private moteT = 0;
  private hazeT = 0;

  constructor(
    scene: Scene,
    depth: number,
    markDepth: number,
    private fx: FxTarget,
    private trail: AcidTrail,
  ) {
    const soil = trail.soilDepth,
      puffUnit = unit('gas-body'),
      lineUnit = unit('gas-curl'),
      puff = (key: string, x: number, y: number, w: number, h: number, alpha = 1) =>
        part(scene, key, x, y)
          .setScale((w / 32) * puffUnit, (h / 32) * puffUnit)
          .setAlpha(alpha);
    this.root = new Ribbon(scene, 'myc-root', ROOT_POINTS);
    this.root.rope.setDepth(soil);
    this.rootAlphas = Array.from({ length: ROOT_POINTS * 2 }, () => 1);
    this.head = part(scene, 'myc-head')
      .setBlendMode(BlendModes.ADD)
      .setDepth(soil + 0.01);
    this.mound = part(scene, 'dirt-mound').setDepth(soil + 0.02);
    this.spot = part(scene, 'toadlet-spot').setDepth(depth - 0.02);
    this.beam = part(scene, 'pollen-beam')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.mark = part(scene, 'warn-mark').setDepth(markDepth);
    this.halo = part(scene, 'ring-halo')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.footGlow = part(scene, 'ring-foot-glow')
      .setBlendMode(BlendModes.ADD)
      .setDepth(depth - 0.05);
    this.plume = scene.add
      .container(0, 0, [
        ...PLUME_BACK.map(([x, y, w, h, a]) => puff('gas-back', x, y, w, h, a)),
        ...PLUME_MID.map(([x, y, w, h, a]) => puff('gas-mid', x, y, w, h, a)),
      ])
      .setDepth(depth - 0.01);
    this.column = scene.add
      .tileSprite(0, GROUND, JET_W, GROUND - TOP, 'ring-jet')
      .setOrigin(0.5, 1)
      .setTileScale(unit('ring-jet'))
      .setDepth(depth);
    this.plumeTop = scene.add
      .container(0, 0, [
        ...PLUME_TOP.map(([x, y, w, h]) => puff('gas-body', x, y, w, h)),
        ...PLUME_CURLS.map(([x, y, r]) =>
          part(scene, 'gas-curl', x, y)
            .setScale((r / 12) * lineUnit)
            .setTint(0x3f9a3c)
            .setAlpha(0.8),
        ),
        ...PLUME_WISPS.map(([x, y, len]) =>
          part(scene, 'gas-wisp', x, y)
            .setScale((len / 30) * lineUnit)
            .setAlpha(0.5),
        ),
      ])
      .setDepth(depth + 0.01);
    this.foot = scene.add
      .container(
        0,
        0,
        FOOT.map(([x, y, w, h]) => puff('gas-body', x, y, w, h, 0.95)),
      )
      .setDepth(depth + 0.01);
    for (const [u, v, h] of SHROOMS) {
      const set = shroomSet(h);
      this.toadstools.push({
        image: part(scene, `ring-shroom-${set}`).setDepth(v < 0 ? depth + 0.02 : markDepth - 0.02),
        u,
        v,
        scale: (INV * h) / SHROOM_SIZES[set],
      });
    }
    this.hideAll();
  }

  private hideAll() {
    this.hideWarning();
    this.hideEruption();
    this.root.rope.setVisible(false);
    this.head.setVisible(false);
    this.mound.setVisible(false);
    this.plume.setVisible(false);
    this.plumeTop.setVisible(false);
  }
  private hideWarning() {
    this.spot.setVisible(false);
    this.beam.setVisible(false);
    this.mark.setVisible(false);
    for (const s of this.toadstools) s.image.setVisible(false);
  }
  private hideEruption() {
    this.column.setVisible(false);
    this.halo.setVisible(false);
    this.foot.setVisible(false);
    this.footGlow.setVisible(false);
  }

  // Once the ring has stopped hurting, what's left drifts and fades by itself: see fade().
  setVisible(visible: boolean) {
    if (visible || !this.live) return;
    this.live = false;
    this.hideWarning();
    this.hideEruption();
    this.after = AFTER;
  }

  fade(dt: number) {
    if (this.after <= 0) return;
    this.after -= dt;
    if (this.after <= 0) {
      this.hideAll();
      return;
    }
    const u = 1 - this.after / AFTER;
    this.plume.setY(this.plume.y - dt * 50).setAlpha(1 - u);
    this.plumeTop.setY(this.plumeTop.y - dt * 50).setAlpha(1 - u);
    // the root goes along its length, Mo's end first
    for (let i = 0; i < ROOT_POINTS; i++) {
      const a = clamp(1 - i / (ROOT_POINTS - 1) + 1 - 2 * u, 0, 1);
      this.rootAlphas[i * 2] = this.rootAlphas[i * 2 + 1] = a;
    }
    this.root.rope.setAlphas(this.rootAlphas);
  }

  sync(hazard: Hazard, alpha: number, dt: number, fresh: boolean) {
    const ring = hazard as FairyRing,
      x = lerp(ring.px, ring.x, alpha);
    if (fresh) {
      this.live = true;
      this.after = 0;
      this.fromX = ring.from;
      this.seekT = this.warnT = this.eruptT = 0;
      this.hideAll();
      this.rootAlphas.fill(1);
      this.root.rope.setAlphas(this.rootAlphas).setVisible(true);
      this.plume.setAlpha(1);
      this.plumeTop.setAlpha(1);
    }
    if (ring.state === 'seek') this.seek(x, dt);
    else if (ring.state === 'warn') this.warn(x, dt);
    else this.erupt(x, dt);
  }

  // A pale root creeps through the soil to where the ring will be, a mound of soil wobbling over its head.
  private seek(x: number, dt: number) {
    this.seekT += dt;
    this.tipX = lerp(this.fromX, x, easeOutBack(Math.min(1, this.seekT / ROOT_REACH)));
    this.bendRoot();
    const pulse = Math.sin(this.seekT * 18);
    this.head
      .setVisible(true)
      .setPosition(this.tipX, GROUND + ROOT_DEEP + 2)
      .setScale(unit('myc-head') * (1 + pulse * 0.1));
    this.mound
      .setVisible(true)
      .setPosition(this.tipX + Math.sin(this.seekT * 26) * 1.6, GROUND + 3)
      .setScale(INV * 0.34, INV * (0.3 + Math.sin(this.seekT * 19) * 0.05));
    this.clodT -= dt;
    if (this.clodT <= 0) {
      this.clodT = 0.12;
      this.fx.burst(this.tipX, GROUND, {
        n: 1,
        shape: 'clod',
        colors: ['#3d2f5c', '#5a4a70'],
        speed: 120,
        size: 3,
        life: 0.5,
        gravity: 600,
        dir: UP,
        spread: 1.4,
      });
    }
  }

  // Toadstools pop up around him under the "!", with a ring and a beam to say where. Orange never hurts.
  private warn(x: number, dt: number) {
    this.warnT += dt;
    this.tipX = x;
    this.bendRoot();
    this.head.setVisible(false);
    this.mound.setVisible(false);
    const grow = easeOutBack(clamp(this.warnT / 0.25, 0, 1));
    this.spot
      .setVisible(true)
      .setPosition(x, GROUND + 1)
      .setScale(INV * grow * (SPOT_WIDE / SPOT_R));
    this.beam
      .setVisible(true)
      .setPosition(x, GROUND)
      .setScale((INV * 58) / BEAM_W, INV)
      .setAlpha(clamp(this.warnT / 0.25, 0, 1) * 0.5);
    showMark(this.mark, x, GROUND - 78, this.warnT);
    this.placeToadstools(x, 0);
    this.hazeT -= dt;
    if (this.hazeT <= 0) {
      this.hazeT = 0.14;
      this.trail.drop(x + rand(-22, 22), GROUND - 16 - rand(0, 64), 0.28);
    }
  }

  private placeToadstools(x: number, thrown: number) {
    const swelling = this.warnT > RING_WARN - 0.15 && this.eruptT === 0,
      swell = swelling ? 1.15 : 1,
      tremble = swelling ? rand(-1.2, 1.2) : 0,
      away = clamp((RING_ERUPT - this.eruptT) / 0.25, 0, 1);
    this.toadstools.forEach((s, i) => {
      const k = easeOutBack(clamp((this.warnT - i * POP_GAP) / POP, 0, 1));
      s.image
        .setVisible(k > 0.01 && away > 0)
        .setPosition(x + s.u * (52 + thrown * 5) + tremble, GROUND + 1 + s.v * 12)
        .setRotation(s.u * thrown * 0.4)
        .setScale(s.scale * k * swell * away);
    });
  }

  // At full height from its first frame, because it hurts from its first frame.
  private erupt(x: number, dt: number) {
    this.eruptT += dt;
    this.spot.setVisible(false);
    this.beam.setVisible(false);
    this.mark.setVisible(false);
    this.placeToadstools(x, 1);
    const wide = lerp(1.25, 1, clamp(this.eruptT / 0.12, 0, 1)),
      taper = clamp((RING_ERUPT - this.eruptT) / 0.08, 0, 1),
      sway = Math.sin(this.eruptT * 7) * 1.5;
    this.column
      .setVisible(true)
      .setPosition(x, GROUND)
      .setScale(wide * taper, 1)
      .setTilePosition(0, this.eruptT * JET_SPEED);
    this.halo
      .setVisible(true)
      .setPosition(x, (TOP + GROUND) / 2)
      .setScale(unit('ring-halo'), ((GROUND - TOP) / 90) * unit('ring-halo'));
    this.plume.setVisible(true).setPosition(x, sway);
    this.plumeTop.setVisible(true).setPosition(x, sway);
    this.foot.setVisible(true).setPosition(x, 0);
    this.footGlow
      .setVisible(true)
      .setPosition(x, GROUND + 2)
      .setAlpha(0.85 + Math.sin(this.eruptT * 22) * 0.15);
    this.moteT -= dt;
    if (this.moteT <= 0) {
      this.moteT = 0.2;
      this.fx.burst(x, rand(170, GROUND - 40), {
        n: 5,
        shape: 'soft',
        color: '#f4ffb8',
        speed: 90,
        size: 3.4,
        life: 0.6,
        gravity: -130,
        glow: true,
        radius: 36,
      });
    }
  }

  // Its head is thick and its far end thin, and the rootlets go down whichever way it runs.
  private bendRoot() {
    const reach = this.fromX - this.tipX,
      flip = reach < 0 ? -1 : 1,
      rootUnit = unit('myc-root');
    this.root.rope.setScale(rootUnit, flip * rootUnit);
    for (let i = 0; i < ROOT_POINTS; i++) {
      const u = i / (ROOT_POINTS - 1);
      this.root.set(i, this.tipX + reach * u, flip * (GROUND + ROOT_DEEP));
    }
    this.root.bend();
  }
}
