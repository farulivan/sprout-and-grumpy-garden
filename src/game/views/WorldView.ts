// The arena, back to front: sky, land, the ground the fight stands on, and the air in front of it all.
// Each of those lives in src/game/views/world/. This file puts them together, turns the weather to match
// the boss's mood, and slides the layers a little as Pip moves so the arena has depth. The sky, the air and
// the weather are the same in every arena; its land and ground are its own (ArenaParts).
import type { GameObjects, Scene } from 'phaser';
import { W } from '../../config';
import type { Fight } from '../../sim/fight';
import { clamp, lerp } from '../../sim/math';
import type { FaceMood } from '../art/face';
import { Air, bakeAir } from './world/air';
import { bakeGround } from './world/ground';
import { bakeLand } from './world/land';
import { bakeSky, Sky } from './world/sky';
import { moodOf, Weather, type Mood } from './world/weather';

export function bakeWorld(scene: Scene) {
  bakeSky(scene);
  bakeLand(scene);
  bakeGround(scene);
  bakeAir(scene);
}

// Depths: `back` is behind everything, `ground` is under the boss, `platforms` is in front of the boss,
// and `front` is in front of the whole fight.
export interface WorldDepths {
  back: number;
  ground: number;
  platforms: number;
  front: number;
}

// What makes an arena its own: the land behind the fight, and the ground it stands on.
export interface ArenaLand {
  sync(t: number, weather: Weather, pan: number): void;
}
export interface ArenaGround {
  sync(t: number, dt: number, weather: Weather, pan: number): void;
}
export interface ArenaParts {
  land(scene: Scene, layer: GameObjects.Container): ArenaLand;
  ground(scene: Scene, depth: WorldDepths): ArenaGround;
  night?: boolean; // a moon and no sun
  mood?(fight: Fight): Mood; // the weather, if not Sunny's...
  startMood?: Mood; // ...and what it starts as
}

export class WorldView {
  readonly weather = new Weather();
  private sky: Sky;
  private land: ArenaLand;
  private ground: ArenaGround;
  private air: Air;
  private moodFor: (fight: Fight) => Mood;
  private t = 0;
  private pan = 0; // -1..1: follows Pip across the arena, smoothly
  private blink = 1 + Math.random() * 3;

  constructor(scene: Scene, depth: WorldDepths, parts: ArenaParts) {
    const back = scene.add.container(0, 0).setDepth(depth.back);
    this.sky = new Sky(scene, back);
    if (parts.night) this.sky.nightSky(scene);
    this.moodFor = parts.mood ?? moodOf;
    this.land = parts.land(scene, back);
    this.air = new Air(scene, back, depth);
    if (parts.startMood) {
      this.weather.snap(parts.startMood);
      this.air.settle(this.weather);
    }
    this.ground = parts.ground(scene, depth);
  }

  sync(dt: number, fight: Fight, alpha: number) {
    const t = (this.t += dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.5 + Math.random() * 3;

    this.weather.update(this.moodFor(fight), dt);
    const px = lerp(fight.player.px, fight.player.x, alpha);
    this.pan += (clamp((px - W / 2) / (W / 2), -1, 1) - this.pan) * Math.min(1, dt * 2);

    const napping = fight.state === 'down' || fight.state === 'lose';
    const w = this.weather.weight;
    const sunMood: FaceMood = napping
      ? 'worried'
      : w.bloom > 0.5
        ? 'joy'
        : w.calm > 0.5
          ? 'happy'
          : 'worried';

    this.sky.sync(t, dt, this.weather, this.pan, sunMood, this.blink < 0);
    this.land.sync(t, this.weather, this.pan);
    this.ground.sync(t, dt, this.weather, this.pan);
    this.air.sync(t, dt, this.weather, this.pan, napping);
  }
}
