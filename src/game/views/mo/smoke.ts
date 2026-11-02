// Acid smoke: what rolls out each way when Mo lands. Soft layers, not hard circles: hard ones with dark outlines look
// like a hedge or a caterpillar. Only the low, bright body hurts, and it is what the simulation's box covers; the
// layers behind it are atmosphere, and the curls are what say "smoke". Every puff is one soft image, so a whole front
// costs one batch, and the haze it leaves behind it never looks solid, so that it never looks as if it hurts.
import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { GROUND, TAU } from '../../../config';
import { SMOKE_WARN, type AcidSmoke, type Hazard } from '../../../sim/hazards';
import { lerp } from '../../../sim/math';
import { bake, part, SOFT, unit } from '../../art/bake';
import { rgba } from '../../art/color';
import { line, radial, type Ctx } from '../../art/draw';
import { easeOutBack } from '../../motion';
import { MO_PALETTE } from './art';

const GAS = MO_PALETTE.gas;
const PUFF = 64; // the size the puffs are baked at
const FRONT_SCALE = 1.28; // the whole front is drawn a size up from its layout below
const HAZE_STEP = 26, // a puff of haze every this many pixels the front travels...
  HAZE_BEHIND = 70, // ...this far behind it
  HAZE_LIFE = 0.9,
  HAZE_PUFFS = 40,
  SCORCH_FADE = 1.2,
  SCORCHES = 6; // up to six fronts in a triple hop

// A soft-edged puff of gas: solid in the middle, fading over its last part, lit from above if asked.
export function gasPuff(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  alpha = 1,
  edge = 0.72,
  lit: string | null = null,
) {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  c.fillStyle = radial(c, 0, 0, rx, [
    [0, rgba(color, alpha)],
    [edge, rgba(color, alpha)],
    [1, rgba(color, 0)],
  ]);
  c.fillRect(-rx, -rx, rx * 2, rx * 2);
  if (lit) {
    c.fillStyle = radial(c, -rx * 0.22, -rx * 0.32, rx * 0.72, [
      [0, rgba(lit, alpha * 0.85)],
      [1, rgba(lit, 0)],
    ]);
    c.fillRect(-rx, -rx, rx * 2, rx * 2);
  }
  c.restore();
}

// The little "6" a cartoon draws inside smoke: this, not the outline, is what says it's smoke and not slime.
export function curl(c: Ctx, x: number, y: number, r: number, color: string, width = 2.2, alpha = 0.7) {
  c.beginPath();
  for (let a = 0; a < TAU * 1.15; a += 0.3) {
    const d = r * (1 - a / (TAU * 1.5)),
      px = x + Math.cos(a + 2.4) * d,
      py = y + Math.sin(a + 2.4) * d;
    if (a === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  line(c, color, width, alpha);
}

// A wisp curling off the top, thin at its end.
export function wisp(c: Ctx, x: number, y: number, len: number, lean: number, alpha = 0.6) {
  c.beginPath();
  c.moveTo(x, y);
  c.bezierCurveTo(x - lean * 0.2, y - len * 0.4, x - lean, y - len * 0.5, x - lean * 0.9, y - len);
  line(c, '#b6e84c', 3, alpha);
}

// One puff of the harmless haze it leaves behind: soft, pale and without an outline.
function drawHaze(c: Ctx, r: number) {
  gasPuff(c, 0, 0, r, r * 0.6, GAS.mid, 0.9, 0.45);
  gasPuff(c, -r * 0.1, r * 0.08, r * 0.62, r * 0.32, GAS.body, 0.5, 0.4);
}

export function bakeSmoke(scene: Scene) {
  const half = PUFF / 2;
  const puff = (key: string, color: string, edge: number, lit: string | null = null) =>
    bake(scene, key, PUFF, PUFF, half, half, (c) => gasPuff(c, 0, 0, half, half, color, 1, edge, lit), SOFT);
  puff('gas-back', GAS.back, 0.6);
  puff('gas-mid', GAS.mid, 0.64, '#6cc438');
  puff('gas-rim', GAS.rim, 0.82);
  puff('gas-body', GAS.body, 0.8, GAS.hot);
  bake(scene, 'gas-curl', 28, 28, 14, 14, (c) => curl(c, 0, 0, 12, '#ffffff', 3.4, 1));
  bake(scene, 'gas-wisp', 34, 40, 25, 36, (c) => wisp(c, 0, 0, 30, 18, 1));
  bake(scene, 'acid-haze', 80, 52, 40, 26, (c) => drawHaze(c, 38), SOFT);
  bake(
    scene,
    'acid-scorch',
    128,
    24,
    64,
    12,
    (c) => {
      // a soft line of light along the moss, as long as the part so that it can be stretched
      c.save();
      c.scale(1, 12 / 64);
      c.fillStyle = radial(c, 0, 0, 64, [
        [0, rgba('#b6e84c', 0.9)],
        [0.55, rgba('#b6e84c', 0.42)],
        [1, rgba('#b6e84c', 0)],
      ]);
      c.fillRect(-64, -64, 128, 128);
      c.restore();
    },
    SOFT,
  );
}

// [x, y, width, height, alpha], heading right, on the ground at its middle.
type Piece = readonly [number, number, number, number, number];
const BACK: readonly Piece[] = [
  [-92, -24, 36, 22, 0.4],
  [-62, -36, 36, 26, 0.62],
  [-30, -48, 36, 28, 0.78],
  [2, -50, 32, 28, 0.8],
  [24, -36, 26, 24, 0.75],
];
const MID: readonly Piece[] = [
  [-104, -13, 34, 15, 0.42],
  [-72, -19, 32, 19, 0.7],
  [-42, -28, 30, 23, 0.86],
  [-12, -33, 30, 25, 0.94],
  [18, -27, 26, 22, 0.94],
  [40, -15, 18, 15, 0.9],
];
const BODY: readonly Piece[] = [
  [-58, -9, 28, 12, 0.72],
  [-30, -13, 28, 16, 0.92],
  [-2, -16, 28, 19, 1],
  [24, -14, 24, 17, 1],
  [44, -8, 15, 11, 1],
];
// [x, y, radius, colour, alpha]
const CURLS = [
  [-4, -19, 7.5, 0x3f9a3c, 0.8],
  [24, -16, 6, 0x3f9a3c, 0.75],
  [-34, -36, 8.5, 0x8fd832, 0.55],
  [-2, -56, 7, 0x6cc438, 0.6],
] as const;
const WISPS = [
  [-18, -68, 22, 0.5],
  [-50, -54, 18, 0.38],
] as const;

interface Wobbling {
  image: GameObjects.Image;
  x: number;
  y: number;
  amt: number; // how far it wobbles across
  a: number; // where in its wobble it starts
}

// One smoke front, flipped to the way it is heading.
export class SmokeView {
  private all: GameObjects.Container;
  private pieces: Wobbling[] = [];
  private scorch: Scorch | null = null;
  private startX = 0;
  private dropped = 0; // where it last left a puff of haze

  constructor(
    scene: Scene,
    private trail: AcidTrail,
  ) {
    const images: GameObjects.Image[] = [],
      puffUnit = unit('gas-body'),
      lineUnit = unit('gas-curl'),
      add = (image: GameObjects.Image, x: number, y: number, amt: number) => {
        images.push(image.setPosition(x, y));
        this.pieces.push({ image, x, y, amt, a: x * 0.7 + y + amt });
      },
      layer = (key: string, pieces: readonly Piece[], amt: number, grow = 0, keep = 1) => {
        for (const [x, y, w, h, alpha] of pieces)
          add(
            part(scene, key)
              .setScale((((w + grow) * 2) / PUFF) * puffUnit, (((h + grow) * 2) / PUFF) * puffUnit)
              .setAlpha(alpha * keep),
            x,
            y,
            amt,
          );
      };
    layer('gas-back', BACK, 4);
    layer('gas-mid', MID, 3);
    layer('gas-rim', BODY, 2, 3, 0.75);
    layer('gas-body', BODY, 2);
    for (const [x, y, r, color, alpha] of CURLS)
      add(
        part(scene, 'gas-curl')
          .setScale((r / 12) * lineUnit)
          .setTint(color)
          .setAlpha(alpha),
        x,
        y,
        3,
      );
    for (const [x, y, len, alpha] of WISPS)
      add(
        part(scene, 'gas-wisp')
          .setScale((len / 30) * lineUnit)
          .setAlpha(alpha),
        x,
        y,
        4,
      );
    this.all = scene.add.container(0, 0, images).setDepth(trail.depth + 0.02);
  }

  setVisible(visible: boolean) {
    this.all.setVisible(visible);
  }

  sync(hazard: Hazard, alpha: number, _dt: number, fresh: boolean) {
    const smoke = hazard as AcidSmoke,
      x = lerp(smoke.px, smoke.x, alpha);
    if (fresh) {
      this.scorch = this.trail.takeScorch();
      this.startX = this.dropped = x;
    }
    const swell = easeOutBack(Math.min(1, smoke.t / SMOKE_WARN)) * FRONT_SCALE,
      roll = smoke.t * 1.6 * TAU;
    this.all.setPosition(x, GROUND + 2).setScale(smoke.dir * swell, swell);
    for (const p of this.pieces)
      p.image.setPosition(p.x + Math.sin(roll + p.a) * p.amt, p.y + Math.cos(roll + p.a) * p.amt * 0.6);
    while (Math.abs(x - this.dropped) >= HAZE_STEP) {
      this.dropped += smoke.dir * HAZE_STEP;
      this.trail.drop(this.dropped - smoke.dir * HAZE_BEHIND, GROUND - 13);
    }
    this.scorch?.stretch(this.startX, x);
  }
}

// A soft line of light along the moss, from where he landed to the smoke, that fades once the smoke has gone on.
class Scorch {
  private age = SCORCH_FADE;
  private unit: number;
  readonly image: GameObjects.Image;

  constructor(scene: Scene, depth: number) {
    this.image = part(scene, 'acid-scorch').setBlendMode(BlendModes.ADD).setDepth(depth).setVisible(false);
    this.unit = unit('acid-scorch');
  }
  get spent() {
    return this.age >= SCORCH_FADE;
  }
  stretch(x0: number, x1: number) {
    this.age = 0;
    this.image
      .setVisible(true)
      .setPosition((x0 + x1) / 2, GROUND + 2)
      .setScale(((Math.abs(x1 - x0) + 140) / 128) * this.unit, this.unit * 1.2);
  }
  update(dt: number) {
    if (this.spent) return;
    this.age += dt;
    this.image.setVisible(!this.spent).setAlpha(0.42 * (1 - this.age / SCORCH_FADE));
  }
}

// What smoke leaves behind it, which is what makes it "spread": haze that never looks solid, so that it never looks as
// if it hurts, and the scorch of light under it. One pool for everything that leaves a trail, so that a trail can
// outlive what left it.
interface HazePuff {
  image: GameObjects.Image;
  curl: GameObjects.Image | null;
  t: number;
  x: number;
  y: number;
  size: number;
}
export class AcidTrail {
  private puffs: HazePuff[] = [];
  private scorches: Scorch[] = [];
  private next = 0;
  private hazeUnit: number;
  private curlUnit: number;

  constructor(
    scene: Scene,
    readonly depth: number,
  ) {
    this.hazeUnit = unit('acid-haze');
    this.curlUnit = unit('gas-curl');
    for (let i = 0; i < HAZE_PUFFS; i++) {
      const image = part(scene, 'acid-haze').setDepth(depth).setVisible(false),
        curl =
          i % 2
            ? part(scene, 'gas-curl')
                .setDepth(depth + 0.01)
                .setTint(0xb6e84c)
                .setVisible(false)
            : null;
      this.puffs.push({ image, curl, t: HAZE_LIFE, x: 0, y: 0, size: 1 });
    }
    for (let i = 0; i < SCORCHES; i++) this.scorches.push(new Scorch(scene, depth - 0.03));
  }

  // Leave a puff here.
  drop(x: number, y: number, size = 1) {
    const puff = this.puffs[this.next];
    this.next = (this.next + 1) % this.puffs.length;
    puff.t = 0;
    puff.x = x + (Math.random() - 0.5) * 10;
    puff.y = y + (Math.random() - 0.5) * 5;
    puff.size = size;
    puff.image.setVisible(true);
    puff.curl?.setVisible(size >= 1);
  }

  takeScorch() {
    return this.scorches.find((s) => s.spent) ?? this.scorches[0];
  }

  update(dt: number) {
    for (const scorch of this.scorches) scorch.update(dt);
    for (const puff of this.puffs) {
      if (puff.t >= HAZE_LIFE) continue;
      puff.t += dt;
      const u = puff.t / HAZE_LIFE,
        y = puff.y - u * 18,
        gone = u >= 1;
      puff.image
        .setVisible(!gone)
        .setPosition(puff.x, y)
        .setScale((lerp(38, 60, u) / 38) * this.hazeUnit * puff.size)
        .setAlpha(0.72 * (1 - u));
      if (puff.curl?.visible)
        puff.curl
          .setVisible(!gone)
          .setPosition(puff.x, y - 22)
          .setScale((0.5 + u * 0.3) * this.curlUnit)
          .setAlpha(0.5 * (1 - u));
    }
  }
}
