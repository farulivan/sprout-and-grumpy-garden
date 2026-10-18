// A stage's world, back to front: the sky (it stays put), the landscape sliding past slower the farther away
// it is, Sunny on the horizon growing as Pip nears him, hedges, trees and Pip's cottage, the fence, then the
// ground with its pits, logs, brambles and leaf pads, the sign and the gate, the flowers that grow where a
// grumpy plant was cheered up, and the blurred grass in front. Parts are baked in ./art.ts.
// Everything here is in world positions. Things that should seem to stay put, or to drift slower than the
// ground, are moved with the camera each frame by how far away they are.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, H, W } from '../../../config';
import type { Enemy } from '../../../sim/stage/enemies/enemy';
import type { Stage } from '../../../sim/stage/stage';
import { INV, part, unit } from '../../art/bake';
import { Air } from '../world/air';
import { Sky } from '../world/sky';
import { Weather } from '../world/weather';
import { BLOOMS, FAR_P, FENCE_P, GROUND_BOTTOM, GROUND_TOP, HEDGES, MEADOW_P, TILE } from './art';

export interface StageDepths {
  back: number;
  ground: number;
  platforms: number;
  front: number;
}

const MARGIN = 80; // how far past the edges of the view things are still shown
const PROP_SPEED = 0.72; // how fast the hedges, trees and cottage slide, against the ground

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
  private farSunny: GameObjects.Image;
  private props: Prop[] = []; // hedges, trees and the cottage, sliding at PROP_SPEED
  private fence: Strip;
  private front: Strip;
  private ground: { x0: number; x1: number; tiles: GameObjects.TileSprite }[] = [];
  private caps: Strewn;
  private dressing: Strewn; // tufts and flowers along the ground
  private pads: { image: GameObjects.Image; y: number; x: number }[] = [];
  private blooms: GameObjects.Image[] = [];
  private bloomsUsed = 0;
  private known = new Set<Enemy>();
  private depth: StageDepths;
  private scene: Scene;
  private t = 0;
  private blink = 1;

  constructor(scene: Scene, stage: Stage, depth: StageDepths) {
    this.scene = scene;
    this.depth = depth;
    this.skyLayer = scene.add.container(0, 0).setDepth(depth.back);
    this.sky = new Sky(scene, this.skyLayer);
    this.strips = [
      new Strip(scene, 'stage-mountains', FAR_P, 0.06, 0, depth.back + 0.1),
      new Strip(scene, 'stage-far', FAR_P, 0.16, 0, depth.back + 0.3),
      new Strip(scene, 'stage-meadow', MEADOW_P, 0.38, 0, depth.back + 0.4),
    ];
    this.farSunny = part(scene, 'stage-far-sunny').setDepth(depth.back + 0.2);
    this.airLayer = scene.add.container(0, 0).setDepth(depth.back + 0.5);
    this.air = new Air(scene, this.airLayer, depth);
    this.fence = new Strip(scene, 'stage-fence', FENCE_P, 0.85, 0, depth.back + 0.7);
    this.front = new Strip(scene, 'stage-front-grass', TILE, 1.12, H + 6, depth.front);
    this.caps = new Strewn([]);
    this.dressing = new Strewn([]);
    this.build(stage);
  }

  // Everything that depends on the stage's layout.
  private build(stage: Stage) {
    const scene = this.scene,
      depth = this.depth;
    // hedges and trees in a row behind the fence, Pip's cottage first
    const layerEnd = W + (stage.length - W) * PROP_SPEED;
    this.props.push({
      x: 70,
      image: part(scene, 'stage-cottage')
        .setDepth(depth.back + 0.6)
        .setScale(unit('stage-cottage') * 0.82),
    });
    for (let x = 300, i = 0; x < layerEnd + 200; x += 210 + ((i * 97) % 120), i++) {
      const tree = i % 3 !== 1,
        key = tree ? `tree-${(i * 2) % 3}` : `stage-hedge-${i % HEDGES}`;
      const image = part(scene, key).setDepth(depth.back + 0.6);
      if (tree) image.setScale(unit(key) * (0.85 + ((i * 7) % 4) * 0.08));
      this.props.push({ x, image });
    }
    for (const p of this.props) p.image.setY(GROUND - 12);

    // the ground: one tiling strip per stretch, kept to the part in view; the ends of each stretch, and pits
    const solids = stage.solids.filter((s) => s.y === GROUND);
    const caps: { x: number; w?: number; image: GameObjects.Image }[] = [];
    for (const s of solids) {
      const tiles = scene.add
        .tileSprite(s.x, GROUND_TOP, 1, GROUND_BOTTOM - GROUND_TOP, 'stage-ground')
        .setOrigin(0, 0)
        .setTileScale(unit('stage-ground'))
        .setDepth(depth.ground);
      this.ground.push({ x0: s.x, x1: s.x + s.w, tiles });
    }
    const u = unit('stage-ground-end');
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (i > 0) {
        caps.push({
          x: s.x,
          image: part(scene, 'stage-ground-end', s.x, 0)
            .setScale(-u, u)
            .setDepth(depth.ground + 0.02),
        });
        const gap0 = solids[i - 1].x + solids[i - 1].w,
          pit = part(scene, 'stage-pit', gap0, 0).setDepth(depth.ground - 0.01);
        pit.setScale((unit('stage-pit') * (s.x - gap0)) / 100, unit('stage-pit'));
        caps.push({ x: gap0, w: s.x - gap0, image: pit });
      }
      if (i < solids.length - 1)
        caps.push({
          x: s.x + s.w,
          image: part(scene, 'stage-ground-end', s.x + s.w, 0).setDepth(depth.ground + 0.02),
        });
    }
    this.caps = new Strewn(caps);

    // tufts and flowers strewn along the ground, never at a pit's edge
    const dressing: { x: number; image: GameObjects.Image }[] = [];
    for (const s of solids)
      for (let x = s.x + 30, i = 0; x < s.x + s.w - 30; x += 26 + ((i * 53) % 23), i++) {
        const flower = i % 3 === 0,
          key = flower ? `flower-${(i * 3) % 5}` : `tuft-${i % 3}`,
          image = part(scene, key, x, GROUND - 2).setDepth(depth.ground + 0.01);
        image.setScale(unit(key) * (0.7 + ((i * 11) % 6) * 0.07));
        dressing.push({ x, image });
      }
    this.dressing = new Strewn(dressing);

    // logs, brambles, leaf pads, the sign and the gate
    for (const s of stage.solids.filter((r) => r.y !== GROUND))
      part(scene, 'stage-log', s.x, s.y + s.h)
        .setScale((unit('stage-log') * s.w) / 70, (unit('stage-log') * s.h) / 30)
        .setDepth(depth.ground + 0.03);
    for (const t of stage.thorns)
      part(scene, 'stage-thorns', t.x, t.y + t.h)
        .setScale((unit('stage-thorns') * t.w) / 72, unit('stage-thorns'))
        .setDepth(depth.ground + 0.03);
    for (const p of stage.platforms) {
      const drop = GROUND - p.y - 8;
      part(scene, 'stage-pad-shadow', p.x + p.w / 2, GROUND + 4).setDepth(depth.ground + 0.04);
      part(scene, `stage-stalk-${drop}`, p.x + p.w / 2, p.y + 8).setDepth(depth.platforms);
      const image = part(scene, `stage-pad-${p.w}`).setDepth(depth.platforms);
      this.pads.push({ image, x: p.x + p.w / 2, y: p.y });
    }
    part(scene, 'stage-sign', stage.startX + 130, GROUND - 1).setDepth(depth.ground + 0.03);
    part(scene, 'stage-gate', stage.gateX, GROUND).setDepth(depth.ground + 0.03);
  }

  // A new run of the same stage: the flowers from the last one go.
  reset() {
    for (const b of this.blooms) b.setVisible(false);
    this.bloomsUsed = 0;
    this.known.clear();
  }

  sync(stage: Stage, camX: number, dt: number) {
    const t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.5 + Math.random() * 3;
    this.weather.update('calm', dt);
    const pan = (stage.progress - 0.5) * 0.6;

    this.skyLayer.setX(camX);
    this.sky.sync(t, dt, this.weather, pan, 'happy', this.blink < 0);
    for (const s of this.strips) s.sync(camX);
    // Sunny, far off over the hills, comes closer as Pip walks the path
    const near = stage.progress;
    this.farSunny
      .setPosition(camX + 800 - near * 90, 412 - near * 12)
      .setScale(unit('stage-far-sunny') * (0.5 + near * 0.62))
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
    this.front.sync(camX);

    this.airLayer.setX(camX);
    this.air.sync(t, dt, this.weather, pan, stage.state === 'down', camX);
  }

  // Where a grumpy plant on the ground was cheered up, a smiling flower grows and stays.
  private growBlooms(stage: Stage, t: number) {
    const now = new Set(stage.enemies);
    for (const e of now) this.known.add(e);
    for (const e of this.known) {
      if (now.has(e)) continue;
      this.known.delete(e);
      if (!e.dead || e.kind === 'puffball') continue; // a Puffball's seeds just float away
      let bloom = this.blooms[this.bloomsUsed];
      if (!bloom) {
        bloom = part(this.scene, `stage-bloom-${this.bloomsUsed % BLOOMS}`).setDepth(
          this.depth.ground + 0.04,
        );
        this.blooms.push(bloom);
      }
      bloom.setPosition(e.x, e.y).setVisible(true).setData('born', t);
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
