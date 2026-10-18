// Draws the fight. The App advances the simulation; every frame this scene makes the views match it.
import { Scene } from 'phaser';
import type { App } from '../../app';
import { Fight } from '../../sim/fight';
import { fitCamera } from '../createGame';
import { HitboxOverlay } from '../debug';
import { Fx } from '../fx';
import type { GamePresenter } from '../presenter';
import { BOSS_VIEWS, type BossView } from '../views/bossViews';
import { HazardViews } from '../views/HazardViews';
import { PickupViews } from '../views/PickupViews';
import { PlayerView } from '../views/PlayerView';
import { ProjectileViews } from '../views/ProjectileViews';
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
  private bosses = new Map<string, BossView>(); // one view per boss met so far; only the current one shows
  private showing = '';
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
    this.hazards = new HazardViews(this, DEPTH.hazards, DEPTH.marks, this.fx);
    this.pickups = new PickupViews(this, DEPTH.pickups, this.fx);
    this.player = new PlayerView(this, DEPTH.player, this.fx);
    this.projectiles = new ProjectileViews(this, DEPTH.projectiles);
    this.hitboxes = new HitboxOverlay(this, DEPTH.hitboxes);
    this.hitboxes.visible = new URLSearchParams(location.search).has('hitboxes');
    this.presenter.fx = this.fx;
    this.scene.launch('hud');
    // back from a stage: this scene's effects take over again, starting clean, and the arena fades in
    this.events.on('wake', () => {
      this.fx.clear();
      this.presenter.fx = this.fx;
      this.cameras.main.fadeIn(500, 255, 248, 225);
    });
  }

  // Not called while the game is paused (the App pauses this scene), so everything freezes together.
  override update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000,
      fight = this.app.level,
      alpha = this.app.alpha;
    if (!(fight instanceof Fight)) return; // a stage is being played: its own scene draws it

    this.world.sync(dt, fight, alpha);
    this.bossView(fight.boss.id).sync(fight, alpha, dt);
    this.hazards.sync(fight.hazards, alpha, dt);
    this.pickups.sync(fight.pickups, alpha, dt);
    this.player.sync(fight, alpha, dt);
    this.projectiles.sync(fight.projectiles, alpha);
    this.hitboxes.sync(fight);

    // Particles slow down with the fight during the win slow-motion; the camera always settles in real time.
    const still = fight.state === 'title' || fight.state === 'win' || fight.state === 'lose';
    this.fx.update(still ? dt : dt * fight.timeScale, dt);
  }

  private bossView(id: keyof typeof BOSS_VIEWS): BossView {
    let view = this.bosses.get(id);
    if (!view) {
      view = BOSS_VIEWS[id].create(this, DEPTH.boss, this.fx);
      this.bosses.set(id, view);
    }
    if (id !== this.showing) {
      this.showing = id;
      for (const [key, other] of this.bosses) other.setVisible(key === id);
    }
    return view;
  }
}
