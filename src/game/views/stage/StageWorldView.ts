// A stage's world, back to front: the sky (it stays put), the landscape sliding past slower the farther away
// it is, the boss on the horizon growing as Pip nears him, what stands behind the fence (Pip's cottage, hedges
// and trees on the Garden Path), the fence, then the ground with its pits, logs, brambles and leaf pads, the
// sign and the gate, what grows where a grumpy plant was cheered up, and the blur in front. Which parts those
// are is the stage's theme (see gardenTheme.ts); this file lays them out for any stage's layout.
// Everything here is in world positions. Things that should seem to stay put, or to drift slower than the
// ground, are moved with the camera each frame by how far away they are.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, W } from '../../../config';
import type { Enemy } from '../../../sim/stage/enemies/enemy';
import type { Glade, Stage } from '../../../sim/stage/stage';
import { INV, part, unit } from '../../art/bake';
import { Air } from '../world/air';
import { Sky } from '../world/sky';
import { Weather, type Mood } from '../world/weather';
import { GROUND_BOTTOM, GROUND_TOP } from './art';

export interface StageDepths {
  back: number;
  ground: number;
  platforms: number;
  front: number;
}

// A strip of landscape that repeats: its part, how long it is before it repeats, how fast it slides against
// the ground (0 = stays put, 1 = moves with the ground) and how high it sits. depth: where it goes, just over
// depth.back (the boss on the horizon is at 0.2 and the props at 0.6).
export interface StripTheme {
  readonly key: string;
  readonly period: number;
  readonly speed: number;
  readonly y: number;
  readonly depth: number;
}
// A prop that stands behind the fence. size: how big, if it is scaled at all.
export interface PropTheme {
  readonly key: string;
  readonly size?: number;
}
// What a stage's world is made of: the keys of its baked parts, and the weather along it.
export interface StageTheme {
  readonly strips: readonly StripTheme[]; // far to near
  readonly horizon: string; // the boss, far off
  readonly fence: StripTheme; // the nearest strip, sliding just slower than the ground
  readonly front: Omit<StripTheme, 'depth'>; // the blur in front of it all, sliding just faster
  readonly home?: PropTheme & { readonly x: number }; // what stands at the start, before the row of props
  readonly prop: (i: number) => PropTheme; // the i-th in the row
  // the strip that tiles along the ground, the end of a stretch of it, and a pit baked 100 wide
  readonly ground: { readonly tile: string; readonly end: string; readonly pit: string };
  readonly dressing: (i: number) => string; // the i-th small thing strewn along the ground
  readonly log: string; // baked 70 wide and 30 high, and stretched to fit
  readonly trunk: string; // baked 70 wide and 200 high, and stretched to fit
  readonly bramble: string; // a glade's wall, its foot in the middle, drawn rising from the ground
  readonly thorns: string; // baked 72 wide, and stretched to fit
  readonly pad: (w: number) => string; // a leaf pad of this width
  readonly stalk: (drop: number) => string; // what holds up a pad, this far above the ground
  readonly padShadow: string;
  readonly sign: string;
  readonly gate: string;
  readonly bloom: (i: number) => string; // the i-th thing to grow where a plant was cheered up
  readonly mood: (progress: number) => Mood; // the weather, by how far along the stage Pip is (0 to 1)
}

const MARGIN = 80; // how far past the edges of the view things are still shown
const PROP_SPEED = 0.72; // how fast the props behind the fence slide, against the ground

// A strip of landscape that repeats, sliding at `speed` times the camera's pace (0 = stays put, 1 = moves
// with the ground).
class Strip {
  private copies: GameObjects.Image[];

  constructor(
    scene: Scene,
    key: string,
    private period: number,
    private speed: number,
    y: number,
    depth: number,
  ) {
    const n = Math.ceil((W + MARGIN) / period) + 1;
    this.copies = Array.from({ length: n }, () => part(scene, key, 0, y).setDepth(depth));
  }

  sync(camX: number) {
    const slide = (((camX * this.speed) % this.period) + this.period) % this.period;
    this.copies.forEach((img, i) => img.setX(camX - slide + i * this.period));
  }
}

// Images set along the stage at fixed world positions, shown only while near the view. w: how far each
// reaches to the right of its x.
class Strewn {
  constructor(private items: { x: number; w?: number; image: GameObjects.Image }[]) {}
  sync(camX: number) {
    for (const { x, w = 0, image } of this.items)
      image.setVisible(x + w > camX - MARGIN && x < camX + W + MARGIN);
  }
}

interface Prop {
  x: number; // where it stands in its layer
  image: GameObjects.Image;
}

export class StageWorldView {
  private weather = new Weather();
  private skyLayer: GameObjects.Container;
  private airLayer: GameObjects.Container;
  private sky: Sky;
  private air: Air;
  private strips: Strip[];
  private horizon: GameObjects.Image; // the boss, far off
  private props: Prop[] = []; // what stands behind the fence, sliding at PROP_SPEED
  private fence: Strip;
  private front: Strip;
  private ground: { x0: number; x1: number; tiles: GameObjects.TileSprite }[] = [];
  private caps: Strewn;
  private dressing: Strewn; // tufts and flowers along the ground
  private pads: { image: GameObjects.Image; y: number; x: number }[] = [];
  private walls: { glade: Glade; images: GameObjects.Image[] }[] = [];
  private blooms: GameObjects.Image[] = [];
  private bloomsUsed = 0;
  private known = new Set<Enemy>();
  private depth: StageDepths;
  private scene: Scene;
  private t = 0;
  private blink = 1;

  constructor(
    scene: Scene,
    stage: Stage,
    depth: StageDepths,
    private theme: StageTheme,
  ) {
    this.scene = scene;
    this.depth = depth;
    this.skyLayer = scene.add.container(0, 0).setDepth(depth.back);
    this.sky = new Sky(scene, this.skyLayer);
    const strip = (s: Omit<StripTheme, 'depth'>, at: number) =>
      new Strip(scene, s.key, s.period, s.speed, s.y, at);
    this.strips = theme.strips.map((s) => strip(s, depth.back + s.depth));
    this.horizon = part(scene, theme.horizon).setDepth(depth.back + 0.2);
    this.airLayer = scene.add.container(0, 0).setDepth(depth.back + 0.5);
    this.air = new Air(scene, this.airLayer, depth);
    this.fence = strip(theme.fence, depth.back + theme.fence.depth);
    this.front = strip(theme.front, depth.front);
    this.caps = new Strewn([]);
    this.dressing = new Strewn([]);
    this.build(stage);
  }

  // Everything that depends on the stage's layout.
  private build(stage: Stage) {
    const scene = this.scene,
      depth = this.depth,
      theme = this.theme;
    // a row of props behind the fence, the home first
    const layerEnd = W + (stage.length - W) * PROP_SPEED;
    const prop = ({ key, size }: PropTheme) => {
      const image = part(scene, key).setDepth(depth.back + 0.6);
      return size === undefined ? image : image.setScale(unit(key) * size);
    };
    if (theme.home) this.props.push({ x: theme.home.x, image: prop(theme.home) });
    for (let x = 300, i = 0; x < layerEnd + 200; x += 210 + ((i * 97) % 120), i++)
      this.props.push({ x, image: prop(theme.prop(i)) });
    for (const p of this.props) p.image.setY(GROUND - 12);

    // the ground: one tiling strip per stretch, kept to the part in view; the ends of each stretch, and pits
    const { tile, end, pit: pitKey } = theme.ground;
    const solids = stage.solids.filter((s) => s.y === GROUND);
    const caps: { x: number; w?: number; image: GameObjects.Image }[] = [];
    for (const s of solids) {
      const tiles = scene.add
        .tileSprite(s.x, GROUND_TOP, 1, GROUND_BOTTOM - GROUND_TOP, tile)
        .setOrigin(0, 0)
        .setTileScale(unit(tile))
        .setDepth(depth.ground);
      this.ground.push({ x0: s.x, x1: s.x + s.w, tiles });
    }
    const u = unit(end);
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (i > 0) {
        caps.push({
          x: s.x,
          image: part(scene, end, s.x, 0)
            .setScale(-u, u)
            .setDepth(depth.ground + 0.02),
        });
        const gap0 = solids[i - 1].x + solids[i - 1].w,
          pit = part(scene, pitKey, gap0, 0).setDepth(depth.ground - 0.01);
        pit.setScale((unit(pitKey) * (s.x - gap0)) / 100, unit(pitKey));
        caps.push({ x: gap0, w: s.x - gap0, image: pit });
      }
      if (i < solids.length - 1)
        caps.push({
          x: s.x + s.w,
          image: part(scene, end, s.x + s.w, 0).setDepth(depth.ground + 0.02),
        });
    }
    this.caps = new Strewn(caps);

    // small things strewn along the ground, never at a pit's edge
    const dressing: { x: number; image: GameObjects.Image }[] = [];
    for (const s of solids)
      for (let x = s.x + 30, i = 0; x < s.x + s.w - 30; x += 26 + ((i * 53) % 23), i++) {
        const key = theme.dressing(i),
          image = part(scene, key, x, GROUND - 2).setDepth(depth.ground + 0.01);
        image.setScale(unit(key) * (0.7 + ((i * 11) % 6) * 0.07));
        dressing.push({ x, image });
      }
    this.dressing = new Strewn(dressing);

    // logs, brambles, leaf pads, the sign and the gate
    for (const s of stage.solids.filter((r) => r.y !== GROUND && !stage.trunks.includes(r)))
      part(scene, theme.log, s.x, s.y + s.h)
        .setScale((unit(theme.log) * s.w) / 70, (unit(theme.log) * s.h) / 30)
        .setDepth(depth.ground + 0.03);
    for (const s of stage.trunks)
      part(scene, theme.trunk, s.x, s.y + s.h)
        .setScale((unit(theme.trunk) * s.w) / 70, (unit(theme.trunk) * s.h) / 200)
        .setDepth(depth.ground + 0.03);
    for (const t of stage.thorns)
      part(scene, theme.thorns, t.x, t.y + t.h)
        .setScale((unit(theme.thorns) * t.w) / 72, unit(theme.thorns))
        .setDepth(depth.ground + 0.03);
    for (const p of stage.platforms) {
      const drop = GROUND - p.y - 8;
      part(scene, theme.padShadow, p.x + p.w / 2, GROUND + 4).setDepth(depth.ground + 0.04);
      part(scene, theme.stalk(drop), p.x + p.w / 2, p.y + 8).setDepth(depth.platforms);
      const image = part(scene, theme.pad(p.w)).setDepth(depth.platforms);
      this.pads.push({ image, x: p.x + p.w / 2, y: p.y });
    }
    part(scene, theme.sign, stage.startX + 130, GROUND - 1).setDepth(depth.ground + 0.03);
    part(scene, theme.gate, stage.gateX, GROUND).setDepth(depth.ground + 0.03);
  }

  // A new run of the same stage: the flowers from the last one go, and its glades stand open again.
  reset(stage: Stage) {
    for (const b of this.blooms) b.setVisible(false);
    this.bloomsUsed = 0;
    this.known.clear();
    this.walls = stage.glades.map((glade, i) => ({
      glade,
      images: (this.walls[i]?.images ?? this.makeWalls(glade)).map((image, side) =>
        image.setX(side ? glade.x1 : glade.x0).setVisible(false),
      ),
    }));
  }

  private makeWalls(glade: Glade) {
    return [glade.x0, glade.x1].map((x) =>
      part(this.scene, this.theme.bramble, x, GROUND + 4).setDepth(this.depth.platforms),
    );
  }

  // A glade's brambles spring up as it shuts, and wither as it opens.
  private syncWalls() {
    for (const { glade, images } of this.walls) {
      const up =
        glade.state === 'closed'
          ? Math.min(1, glade.t / 0.22)
          : glade.state === 'open'
            ? Math.max(0, 1 - glade.t / 0.45)
            : 0;
      for (const image of images)
        image.setVisible(up > 0).setScale(unit(this.theme.bramble), unit(this.theme.bramble) * up);
    }
  }

  sync(stage: Stage, camX: number, dt: number) {
    const t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.5 + Math.random() * 3;
    this.weather.update(this.theme.mood(stage.progress), dt);
    const pan = (stage.progress - 0.5) * 0.6;

    this.skyLayer.setX(camX);
    this.sky.sync(t, dt, this.weather, pan, 'happy', this.blink < 0);
    for (const s of this.strips) s.sync(camX);
    // the boss, far off over the hills, comes closer as Pip walks the path
    const near = stage.progress;
    this.horizon
      .setPosition(camX + 800 - near * 90, 412 - near * 12)
      .setScale(unit(this.theme.horizon) * (0.5 + near * 0.62))
      .setRotation(Math.sin(t * 0.7) * 0.03);
    for (const p of this.props) {
      const x = p.x + camX * (1 - PROP_SPEED);
      p.image.setX(x).setVisible(x > camX - 200 && x < camX + W + 200);
    }
    this.fence.sync(camX);

    for (const g of this.ground) {
      const x0 = Math.max(g.x0, camX - MARGIN),
        x1 = Math.min(g.x1, camX + W + MARGIN);
      g.tiles.setVisible(x1 > x0);
      if (x1 > x0) {
        g.tiles.setX(x0).setSize(x1 - x0, GROUND_BOTTOM - GROUND_TOP);
        g.tiles.tilePositionX = x0 / unit('stage-ground');
      }
    }
    this.caps.sync(camX);
    this.dressing.sync(camX);
    for (const pad of this.pads) {
      const bob = Math.sin(t * 1.5 + pad.x) * 2;
      pad.image.setPosition(pad.x, pad.y + bob).setRotation(Math.sin(t * 1.1 + pad.x) * 0.012);
    }
    this.growBlooms(stage, t);
    this.syncWalls();
    this.front.sync(camX);

    this.airLayer.setX(camX);
    this.air.sync(t, dt, this.weather, pan, stage.state === 'down', camX);
  }

  // Where a grumpy plant on the ground was cheered up, something happy grows and stays (a smiling flower, on
  // the Garden Path).
  private growBlooms(stage: Stage, t: number) {
    const now = new Set(stage.enemies);
    for (const e of now) this.known.add(e);
    for (const e of this.known) {
      if (now.has(e)) continue;
      this.known.delete(e);
      const rootY = e.bloomY();
      if (!e.dead || rootY === null) continue;
      let bloom = this.blooms[this.bloomsUsed];
      if (!bloom) {
        bloom = part(this.scene, this.theme.bloom(this.bloomsUsed)).setDepth(this.depth.ground + 0.04);
        this.blooms.push(bloom);
      }
      bloom.setPosition(e.x, rootY).setVisible(true).setData('born', t);
      this.bloomsUsed++;
    }
    for (let i = 0; i < this.bloomsUsed; i++) {
      const b = this.blooms[i],
        age = t - (b.getData('born') as number),
        grow = Math.min(1, age / 0.35),
        overshoot = 1 + Math.sin(grow * Math.PI) * 0.35;
      b.setScale(INV * grow * overshoot).setRotation(Math.sin(t * 1.4 + b.x * 0.05) * 0.06);
    }
  }
}
