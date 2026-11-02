// Mo's hollow, for now the Mushroom Wood's own parts standing still and sliding a little as Pip moves, with the two
// shelf fungi the fight stands on. It takes the weather's tints as his mood turns.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, H, W } from '../../../config';
import { MO_PLATFORMS } from '../../../sim/bosses/mo';
import { part, unit } from '../../art/bake';
import { GROUND_BOTTOM, GROUND_TOP } from '../stage/art';
import type { Weather } from '../world/weather';
import type { ArenaGround, ArenaLand, WorldDepths } from '../WorldView';
import { BRUSH_P, CANOPY_P } from './art';

export class HollowLand implements ArenaLand {
  private far: GameObjects.Image;
  private mid: GameObjects.Image;
  private near: GameObjects.Image;
  private brush: GameObjects.Image[];
  private canopy: GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Container) {
    this.far = part(scene, 'wood-far');
    this.mid = part(scene, 'wood-mid');
    this.near = part(scene, 'wood-near');
    this.canopy = [0, 1].map((i) => part(scene, 'wood-canopy', -40 + i * CANOPY_P, 0));
    this.brush = [0, 1].map((i) => part(scene, 'wood-brush', -40 + i * BRUSH_P, 0));
    layer.add([this.far, this.mid, this.near, ...this.canopy, ...this.brush]);
  }

  sync(_t: number, weather: Weather, pan: number) {
    const { hillTint, landTint } = weather.look;
    this.far.setX(-600 + pan * 12).setTint(hillTint);
    this.mid.setX(-300 + pan * 18).setTint(hillTint);
    this.near.setX(-40 + pan * 26).setTint(landTint);
    this.canopy.forEach((c, i) => c.setX(-40 + i * CANOPY_P + pan * 30).setTint(landTint));
    this.brush.forEach((b, i) => b.setX(-40 + i * BRUSH_P + pan * 34).setTint(landTint));
  }
}

export class HollowGround implements ArenaGround {
  private tiles: GameObjects.TileSprite;
  private shelves: { image: GameObjects.Image; x: number; y: number }[];
  private front: GameObjects.Image[];
  private tinted: (GameObjects.Image | GameObjects.TileSprite)[];
  private tint = 0xffffff;

  constructor(scene: Scene, depth: WorldDepths) {
    this.tiles = scene.add
      .tileSprite(-60, GROUND_TOP, W + 120, GROUND_BOTTOM - GROUND_TOP, 'wood-ground')
      .setOrigin(0, 0)
      .setTileScale(unit('wood-ground'))
      .setDepth(depth.ground);
    const stalks = MO_PLATFORMS.map((p) =>
      part(scene, `wood-stalk-${GROUND - p.y - 8}`, p.x + p.w / 2, p.y + 8).setDepth(depth.platforms),
    );
    this.shelves = MO_PLATFORMS.map((p) => ({
      image: part(scene, `wood-pad-${p.w}`).setDepth(depth.platforms),
      x: p.x + p.w / 2,
      y: p.y,
    }));
    this.front = [0, 1].map((i) => part(scene, 'wood-front', -60 + i * W, H + 6).setDepth(depth.front));
    this.tinted = [this.tiles, ...stalks, ...this.shelves.map((s) => s.image), ...this.front];
  }

  sync(t: number, _dt: number, weather: Weather, pan: number) {
    const tint = weather.look.groundTint;
    if (tint !== this.tint) {
      this.tint = tint;
      for (const image of this.tinted) image.setTint(tint);
    }
    for (const s of this.shelves) s.image.setPosition(s.x, s.y + Math.sin(t * 1.5 + s.x) * 1.5);
    this.front.forEach((f, i) => f.setX(-60 + i * W - pan * 20));
  }
}
