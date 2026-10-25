// Pip's yard behind the title and the menu, back to front: the arena's sky (with the stars of the dawn), the
// garden path's far hills and meadow, Pip's cottage with no fence before it, hedges and trees behind the fence
// along the path, the ground with its tufts and flowers, and the blurred grass in front. It belongs to no
// boss, so it stays the same however many chapters the game has. The light follows the weather (the dawn of
// the opening, then a clear morning); the opening's acting (the sunrise, the door, the flowers opening, the
// stars going out) is TitleScene's, through the handles below.
import type { GameObjects, Scene } from 'phaser';
import { GROUND, H, W } from '../../../config';
import { DOOR_X } from '../../../sim/yard';
import { part, unit } from '../../art/bake';
import type { FaceMood } from '../../art/face';
import { FAR_P, FENCE_P, GROUND_BOTTOM, GROUND_TOP, MEADOW_P, TILE } from '../stage/art';
import { Air } from '../world/air';
import { Sky } from '../world/sky';
import { Weather, type Mood } from '../world/weather';

export interface YardDepths {
  back: number;
  ground: number;
  front: number;
}

// The cottage is drawn bigger than on the path, so Pip fits through its door.
export const COTTAGE_SCALE = 1.4;
const FENCE_FROM = DOOR_X + 150; // the fence starts past the cottage, which stands in front of it
// Behind the fence, left to right: [x, part, size]
const PROPS: [number, string, number][] = [
  [420, 'stage-hedge-0', 1],
  [560, 'tree-1', 0.92],
  [700, 'stage-hedge-1', 1],
  [840, 'tree-0', 1.02],
  [950, 'stage-hedge-0', 0.9],
];
// The stars still out at dawn, high in the sky: [x, y, size]
const STARS: [number, number, number][] = [
  [52, 34, 0.8],
  [118, 168, 0.55],
  [214, 58, 1],
  [300, 132, 0.6],
  [372, 28, 0.75],
  [452, 96, 1.1],
  [538, 40, 0.6],
  [612, 150, 0.7],
  [688, 70, 0.9],
  [770, 24, 0.65],
  [842, 118, 1],
  [918, 54, 0.7],
];

export interface Flower {
  image: GameObjects.Image;
  x: number;
  size: number; // its scale when open
}

export class YardView {
  readonly weather = new Weather();
  readonly stars: GameObjects.Image[];
  readonly flowers: Flower[] = [];
  readonly door: GameObjects.Image;
  readonly doorway: GameObjects.Image;
  readonly doorScale = unit('title-door') * COTTAGE_SCALE;
  readonly doorX = DOOR_X;
  private sky: Sky;
  private air: Air;
  // what the weather tints, by which of its tints: far hills, the land, and the ground
  private hills: GameObjects.Image[] = [];
  private land: GameObjects.Image[] = [];
  private ground: (GameObjects.Image | GameObjects.TileSprite)[] = [];
  private tinted = '';
  private t = 0;
  private blink = 1;

  constructor(scene: Scene, depth: YardDepths) {
    const back = scene.add.container(0, 0).setDepth(depth.back);
    this.sky = new Sky(scene, back);
    this.stars = STARS.map(([x, y, size]) =>
      part(scene, 'title-star', x, y).setScale(unit('title-star') * size),
    );
    this.sky.behindSun(this.stars);
    const strip = (key: string, period: number, z: number, into: GameObjects.Image[]) => {
      for (let x = -period / 2; x < W; x += period)
        into.push(part(scene, key, x, 0).setDepth(depth.back + z));
    };
    strip('stage-mountains', FAR_P, 0.1, this.hills);
    strip('stage-far', FAR_P, 0.3, this.hills);
    strip('stage-meadow', MEADOW_P, 0.4, this.land);
    const airLayer = scene.add.container(0, 0).setDepth(depth.back + 0.5);
    this.air = new Air(scene, airLayer, depth);

    for (const [x, key, size] of PROPS)
      this.land.push(
        part(scene, key, x, GROUND - 12)
          .setScale(unit(key) * size)
          .setDepth(depth.back + 0.6),
      );
    for (let x = FENCE_FROM; x < W + 40; x += FENCE_P)
      this.land.push(part(scene, 'stage-fence', x, 0).setDepth(depth.back + 0.7));
    const cottage = unit('stage-cottage') * COTTAGE_SCALE;
    this.land.push(
      part(scene, 'stage-cottage', DOOR_X, GROUND - 2)
        .setScale(cottage)
        .setDepth(depth.back + 0.8),
    );
    // the door's own parts, over the one painted on the cottage: inside, and the door on its hinge
    this.doorway = part(scene, 'title-doorway', DOOR_X, GROUND - 2)
      .setScale(unit('title-doorway') * COTTAGE_SCALE)
      .setDepth(depth.back + 0.81)
      .setVisible(false);
    this.door = part(scene, 'title-door', DOOR_X - 17 * COTTAGE_SCALE, GROUND - 2)
      .setScale(this.doorScale)
      .setDepth(depth.back + 0.82)
      .setVisible(false);
    this.land.push(this.doorway, this.door);

    this.ground.push(
      scene.add
        .tileSprite(-40, GROUND_TOP, W + 80, GROUND_BOTTOM - GROUND_TOP, 'stage-ground')
        .setOrigin(0, 0)
        .setTileScale(unit('stage-ground'))
        .setDepth(depth.ground),
    );
    // tufts and flowers along the path, none on the cottage's doorstep
    for (let x = 24, i = 0; x < W; x += 26 + ((i * 53) % 23), i++) {
      if (Math.abs(x - DOOR_X) < 44) continue;
      const flower = i % 3 === 0,
        key = flower ? `flower-${(i * 3) % 5}` : `tuft-${i % 3}`,
        size = unit(key) * (0.7 + ((i * 11) % 6) * 0.07),
        image = part(scene, key, x, GROUND - 2)
          .setScale(size)
          .setDepth(depth.ground + 0.01);
      this.ground.push(image);
      if (flower) this.flowers.push({ image, x, size });
    }
    for (let x = 0; x < W + TILE; x += TILE)
      this.ground.push(part(scene, 'stage-front-grass', x, H + 6).setDepth(depth.front));
  }

  // Straight to a look, with no blend: the dawn the opening begins in, or the morning a skip jumps to.
  snapWeather(mood: Mood) {
    this.weather.snap(mood);
    this.air.settle(this.weather);
  }

  // rise: how far the sun still is below its place (it rises in the opening).
  sync(dt: number, sunMood: FaceMood, rise = 0) {
    const t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.5 + Math.random() * 3;
    const look = this.weather.look;
    this.sky.sync(t, dt, this.weather, 0, sunMood, this.blink < 0 && sunMood !== 'sleepy', rise);
    this.air.sync(t, dt, this.weather, 0, false);
    // the light on the yard follows the weather; only redone when it changes
    const tint = `${look.hillTint}.${look.landTint}.${look.groundTint}`;
    if (tint !== this.tinted) {
      this.tinted = tint;
      for (const img of this.hills) img.setTint(look.hillTint);
      for (const img of this.land) img.setTint(look.landTint);
      for (const img of this.ground) img.setTint(look.groundTint);
    }
  }
}
