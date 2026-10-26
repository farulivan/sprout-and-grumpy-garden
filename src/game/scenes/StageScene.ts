// Draws a stage. The App advances the simulation; every frame this scene makes the views match it and points
// the camera where the stage's own camera is (with the shake and punch the effects add). Each run opens with
// an iris on Pip, as the title's closed on him when he set off.
import { Scene, type GameObjects } from 'phaser';
import type { App } from '../../app';
import { W } from '../../config';
import { lerp } from '../../sim/math';
import { Stage } from '../../sim/stage/stage';
import { fitCamera } from '../createGame';
import { HitboxOverlay } from '../debug';
import { Fx } from '../fx';
import { Iris, IRIS_OPEN } from '../views/Iris';
import type { GamePresenter } from '../presenter';
import { EnemyViews } from '../views/EnemyViews';
import { StagePickupViews } from '../views/PickupViews';
import { PlayerView } from '../views/PlayerView';
import { ProjectileViews } from '../views/ProjectileViews';
import { StageWorldView } from '../views/stage/StageWorldView';

// Back to front.
const DEPTH = {
  back: 0,
  ground: 1,
  platforms: 3,
  enemies: 4.5,
  pickups: 5,
  player: 6,
  marks: 6.5, // warnings that must show even where Pip is standing
  projectiles: 7,
  particles: 8,
  front: 9,
  flash: 10,
  iris: 11,
  hitboxes: 100,
};
// The warm light of Sunny's meadow, which the garden fades into at the gate
const MEADOW_LIGHT = [255, 248, 225] as const;
const NIGHT = 0x123f2c; // the iris: the dark green around the game
const IRIS_DARK = 0.12; // a moment of dark before it opens...
const IRIS_OPENS = 0.75; // ...and how long it takes

export class StageScene extends Scene {
  hitboxes!: HitboxOverlay;
  private world!: StageWorldView;
  private player!: PlayerView;
  private enemies!: EnemyViews;
  private pickups!: StagePickupViews;
  private projectiles!: ProjectileViews;
  private fx!: Fx;
  private iris!: Iris;
  private irisLayer!: GameObjects.Container; // fixed to the screen
  private irisT = 0;
  private gentle = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private seen: Stage | null = null;
  private fading = false;

  constructor(
    private app: App,
    private presenter: GamePresenter,
  ) {
    super('stage');
  }

  create() {
    fitCamera(this);
    const stage = this.app.level as Stage; // this scene is only ever run for a stage
    this.fx = new Fx(this, DEPTH.particles, DEPTH.flash);
    this.world = new StageWorldView(this, stage, DEPTH);
    this.enemies = new EnemyViews(this, DEPTH.enemies, DEPTH.marks);
    this.pickups = new StagePickupViews(this, DEPTH.pickups, this.fx);
    this.player = new PlayerView(this, DEPTH.player, this.fx);
    this.projectiles = new ProjectileViews(this, DEPTH.projectiles);
    this.hitboxes = new HitboxOverlay(this, DEPTH.hitboxes);
    this.hitboxes.visible = new URLSearchParams(location.search).has('hitboxes');
    this.irisLayer = this.add.container(0, 0).setDepth(DEPTH.iris);
    this.iris = new Iris(this, 0, this.irisLayer);
    this.takeOver();
    this.events.on('wake', () => this.takeOver());
  }

  // This scene's effects are the ones the presenter drives now, starting clean.
  private takeOver() {
    this.fx.clear();
    this.presenter.fx = this.fx;
  }

  // Not called while the game is paused (the App pauses this scene), so everything freezes together.
  override update(_time: number, deltaMs: number) {
    const stage = this.app.level;
    if (!(stage instanceof Stage)) return;
    const dt = deltaMs / 1000,
      alpha = this.app.alpha;
    if (stage !== this.seen) {
      // a new run: last run's flowers go, and the fade into the boss's meadow is undone
      this.seen = stage;
      this.world.reset();
      this.fading = false;
      this.cameras.main.resetFX();
      this.irisT = 0;
    }
    const camX = lerp(stage.pcamX, stage.camX, alpha);
    this.world.sync(stage, camX, dt);
    this.openIris(stage, camX, dt);
    this.enemies.sync(stage.enemies, alpha, dt);
    this.pickups.sync(stage.pickups, dt);
    this.player.sync(stage, alpha, dt);
    this.projectiles.sync(stage.projectiles, alpha);
    this.hitboxes.syncStage(stage);
    this.fx.update(dt * stage.timeScale, dt, camX + W / 2);
    // walking through the gate, the garden fades into the warm light of Sunny's meadow
    if (stage.state === 'clear' && stage.endT > 1.75 && !this.fading) {
      this.fading = true;
      this.cameras.main.fadeOut(420, ...MEADOW_LIGHT);
    }
  }

  // The run opens with an iris on Pip (a fade, for those who ask for less motion).
  private openIris(stage: Stage, camX: number, dt: number) {
    this.irisT += dt;
    const u = Math.min(1, Math.max(0, (this.irisT - IRIS_DARK) / IRIS_OPENS)),
      p = stage.player;
    this.irisLayer.setX(camX);
    if (u >= 1) this.iris.set(0, 0, IRIS_OPEN, NIGHT);
    else if (this.gentle) this.iris.set(0, 0, 0, NIGHT, 1 - u);
    else this.iris.set(p.x - camX, p.y - 28, IRIS_OPEN * u ** 1.6, NIGHT);
  }
}
