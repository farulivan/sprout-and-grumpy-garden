// Draws the fight. The App advances the simulation; every frame this scene makes the views match it.
import { Scene } from 'phaser';
import type { App } from '../../app';
import { fitCamera } from '../createGame';
import { HitboxOverlay } from '../debug';
import { Fx } from '../fx';
import type { GamePresenter } from '../presenter';
import { BOSS_VIEWS, type BossView } from '../views/bossViews';
import { HazardViews, PickupViews, ProjectileViews } from '../views/EntityViews';
import { PlayerView } from '../views/PlayerView';
import { WorldView } from '../views/WorldView';

// Back to front.
const DEPTH = {
  back: 0,
  ground: 1,
  boss: 2,
  platforms: 3,
  hazards: 4,
  pickups: 5,
  player: 6,
  projectiles: 7,
  particles: 8,
  front: 9,
  flash: 10,
  hitboxes: 100,
};

export class FightScene extends Scene {
  hitboxes!: HitboxOverlay;
  private world!: WorldView;
  private bosses = new Map<string, BossView>(); // one view per boss met so far; only the current one shows
  private player!: PlayerView;
  private projectiles!: ProjectileViews;
  private hazards!: HazardViews;
  private pickups!: PickupViews;
  private fx!: Fx;

  constructor(
    private app: App,
    private presenter: GamePresenter,
  ) {
    super('fight');
  }

  create() {
    fitCamera(this);
    this.fx = new Fx(this, DEPTH.particles, DEPTH.flash);
    this.world = new WorldView(this, DEPTH);
    this.hazards = new HazardViews(this, DEPTH.hazards);
    this.pickups = new PickupViews(this, DEPTH.pickups);
    this.player = new PlayerView(this, DEPTH.player);
    this.projectiles = new ProjectileViews(this, DEPTH.projectiles);
    this.hitboxes = new HitboxOverlay(this, DEPTH.hitboxes);
    this.hitboxes.visible = new URLSearchParams(location.search).has('hitboxes');
    this.presenter.fx = this.fx;
    this.scene.launch('hud');
  }

  // Not called while the game is paused (the App pauses this scene), so everything freezes together.
  override update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000,
      fight = this.app.fight,
      alpha = this.app.alpha;

    this.world.sync(dt, fight, alpha);
    this.bossView(fight.boss.id).sync(fight.boss, alpha, dt);
    this.hazards.sync(fight.hazards, alpha);
    this.pickups.sync(fight.pickups, alpha);
    this.player.sync(fight.player, alpha, dt);
    this.projectiles.sync(fight.projectiles, alpha);
    this.hitboxes.sync(fight);

    // Particles slow down with the fight during the win slow-motion; the camera always settles in real time.
    const still = fight.state === 'title' || fight.state === 'win' || fight.state === 'lose';
    this.fx.update(still ? dt : dt * fight.timeScale, dt);
  }

  private bossView(id: keyof typeof BOSS_VIEWS): BossView {
    let view = this.bosses.get(id);
    if (!view) {
      view = BOSS_VIEWS[id].create(this, DEPTH.boss);
      this.bosses.set(id, view);
    }
    for (const [key, other] of this.bosses) other.setVisible(key === id);
    return view;
  }
}
