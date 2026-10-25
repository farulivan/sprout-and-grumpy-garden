// Pip's yard behind the title and the menu, back to front: the arena's sky, the garden path's far hills and
// meadow, Pip's cottage with no fence before it, hedges and trees behind the fence along the path, the
// ground with its tufts and flowers, and the blurred grass in front. It belongs to no boss, so it stays the
// same however many chapters the game has. The camera holds still here; the opening moves it (TitleScene).
import type { Scene } from 'phaser';
import { GROUND, H, W } from '../../../config';
import { DOOR_X } from '../../../sim/yard';
import { part, unit } from '../../art/bake';
import { FAR_P, FENCE_P, GROUND_BOTTOM, GROUND_TOP, MEADOW_P, TILE } from '../stage/art';
import { Air } from '../world/air';
import { Sky } from '../world/sky';
import { Weather } from '../world/weather';

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

export class YardView {
  readonly weather = new Weather();
  private sky: Sky;
  private air: Air;
  private t = 0;
  private blink = 1;

  constructor(scene: Scene, depth: YardDepths) {
    const back = scene.add.container(0, 0).setDepth(depth.back);
    this.sky = new Sky(scene, back);
    const strip = (key: string, period: number, z: number) => {
      for (let x = -period / 2; x < W; x += period) part(scene, key, x, 0).setDepth(depth.back + z);
    };
    strip('stage-mountains', FAR_P, 0.1);
    strip('stage-far', FAR_P, 0.3);
    strip('stage-meadow', MEADOW_P, 0.4);
    const airLayer = scene.add.container(0, 0).setDepth(depth.back + 0.5);
    this.air = new Air(scene, airLayer, depth);

    for (const [x, key, size] of PROPS)
      part(scene, key, x, GROUND - 12)
        .setScale(unit(key) * size)
        .setDepth(depth.back + 0.6);
    for (let x = FENCE_FROM; x < W + 40; x += FENCE_P)
      part(scene, 'stage-fence', x, 0).setDepth(depth.back + 0.7);
    part(scene, 'stage-cottage', DOOR_X, GROUND - 2)
      .setScale(unit('stage-cottage') * COTTAGE_SCALE)
      .setDepth(depth.back + 0.8);

    scene.add
      .tileSprite(-40, GROUND_TOP, W + 80, GROUND_BOTTOM - GROUND_TOP, 'stage-ground')
      .setOrigin(0, 0)
      .setTileScale(unit('stage-ground'))
      .setDepth(depth.ground);
    // tufts and flowers along the path, none on the cottage's doorstep
    for (let x = 24, i = 0; x < W; x += 26 + ((i * 53) % 23), i++) {
      if (Math.abs(x - DOOR_X) < 44) continue;
      const flower = i % 3 === 0,
        key = flower ? `flower-${(i * 3) % 5}` : `tuft-${i % 3}`;
      part(scene, key, x, GROUND - 2)
        .setScale(unit(key) * (0.7 + ((i * 11) % 6) * 0.07))
        .setDepth(depth.ground + 0.01);
    }
    for (let x = 0; x < W + TILE; x += TILE) part(scene, 'stage-front-grass', x, H + 6).setDepth(depth.front);
  }

  sync(dt: number) {
    const t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.5 + Math.random() * 3;
    this.weather.update('calm', dt);
    this.sky.sync(t, dt, this.weather, 0, 'happy', this.blink < 0);
    this.air.sync(t, dt, this.weather, 0, false);
  }
}
