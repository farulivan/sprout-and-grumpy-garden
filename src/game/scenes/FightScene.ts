// Draws a chapter's boss fight. The App advances the simulation; every frame this scene makes the views match
// it. Each chapter has a scene of its own, and only the one being played runs (see main.ts).
import { Scene } from 'phaser';
import type { App } from '../../app';
import { Fight } from '../../sim/fight';
import { fitCamera } from '../createGame';
import { HitboxOverlay } from '../debug';
import { Fx } from '../fx';
import type { GamePresenter } from '../presenter';
import { BOSS_VIEWS, type BossView } from '../views/bossViews';
import type { ChapterViews } from '../views/chapterViews';
import type { AcidTrail } from '../views/mo/smoke';
import { BouncerViews, EnemyViews } from '../views/EnemyViews';
import { HazardViews } from '../views/HazardViews';
import { PickupViews } from '../views/PickupViews';
import { PlayerView } from '../views/PlayerView';
import { ProjectileViews } from '../views/ProjectileViews';
import type { WorldView } from '../views/WorldView';

// Back to front.
const DEPTH = {
  back: 0,
  ground: 1,
  boss: 2,
  platforms: 3,
  hazards: 4,
  enemies: 4.5,
  pickups: 5,
  player: 6,
  marks: 6.5, // warnings that must show even where Pip is standing
  projectiles: 7,
  particles: 8,
  front: 9,
  flash: 10,
  hitboxes: 100,
};

export class FightScene extends Scene {
  hitboxes!: HitboxOverlay;
  private world!: WorldView;
  private boss: BossView | null = null; // made as his fight is first drawn
  private player!: PlayerView;
  private projectiles!: ProjectileViews;
  private trail?: AcidTrail; // what his attacks leave behind, in a chapter whose boss's do
  private hazards!: HazardViews;
  private pickups!: PickupViews;
  private enemies!: EnemyViews;
  private bouncers!: BouncerViews;
  private fx!: Fx;

  constructor(
    key: string,
    private app: App,
    private presenter: GamePresenter,
    private views: ChapterViews,
  ) {
    super(key);
  }

  create() {
    this.views.prepare?.(this);
    fitCamera(this);
    this.fx = new Fx(this, DEPTH.particles, DEPTH.flash);
    this.world = this.views.arena(this, DEPTH);
    this.trail = this.views.trail?.(this, DEPTH.boss - 0.12, DEPTH.ground + 0.02); // smoke goes behind him: he stays the boldest thing there
    this.hazards = new HazardViews(this, DEPTH.hazards, DEPTH.marks, this.fx, this.trail);
    this.pickups = new PickupViews(this, DEPTH.pickups, this.fx);
    this.enemies = new EnemyViews(this, DEPTH.enemies, DEPTH.marks);
    this.bouncers = new BouncerViews(this, DEPTH.enemies);
    this.player = new PlayerView(this, DEPTH.player, this.fx);
    this.projectiles = new ProjectileViews(this, DEPTH.projectiles);
    this.hitboxes = new HitboxOverlay(this, DEPTH.hitboxes);
    this.hitboxes.visible = new URLSearchParams(location.search).has('hitboxes');
    // Through a stage's gate: this scene's effects take over, starting clean, and the arena fades in from
    // the light at the gate. The first fight creates the scene; later ones wake it.
    const enter = () => {
      this.fx.clear();
      this.presenter.fx = this.fx;
      this.cameras.main.fadeIn(500, ...this.views.gateLight);
    };
    enter();
    this.events.on('wake', enter);
  }

  // Not called while the game is paused (the App pauses this scene), so everything freezes together.
  override update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000,
      fight = this.app.level,
      alpha = this.app.alpha;
    if (!(fight instanceof Fight)) return; // a stage is being played: its own scene draws it

    this.world.sync(dt, fight, alpha);
    this.boss ??= BOSS_VIEWS[fight.boss.id].create(this, DEPTH.boss, this.fx);
    this.boss.sync(fight, alpha, dt);
    this.hazards.sync(fight.hazards, alpha, dt);
    this.trail?.update(dt * fight.timeScale);
    this.pickups.sync(fight.pickups, alpha, dt);
    this.enemies.sync(fight.enemies, alpha, dt);
    this.bouncers.sync(fight.pads);
    this.player.sync(fight, alpha, dt);
    this.projectiles.sync(fight.projectiles, alpha);
    this.hitboxes.sync(fight);

    // Particles slow down with the fight during the win slow-motion; the camera always settles in real time.
    const still = fight.state === 'win' || fight.state === 'lose';
    this.fx.update(still ? dt : dt * fight.timeScale, dt);
  }
}
