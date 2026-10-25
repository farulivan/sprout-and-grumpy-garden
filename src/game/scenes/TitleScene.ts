// Draws Pip's yard behind the opening, the title and the main menu. The App advances the yard (src/sim/yard.ts);
// every frame this scene makes the views match it. Everything the opening animates (the camera, the sun, the
// logo, the door) is worked out from the yard's beat and how far into it the yard is, so skipping the
// opening puts everything in its final place by itself.
import { Scene, type GameObjects } from 'phaser';
import type { App } from '../../app';
import { H, W } from '../../config';
import { clamp } from '../../sim/math';
import { Yard } from '../../sim/yard';
import { fitCamera } from '../createGame';
import { Fx } from '../fx';
import type { GamePresenter } from '../presenter';
import { PlayerView } from '../views/PlayerView';
import { Logo, type LogoPose } from '../views/title/Logo';
import { YardView } from '../views/title/YardView';

// Back to front.
const DEPTH = {
  back: 0,
  ground: 1,
  player: 6,
  particles: 8,
  front: 9,
  logo: 9.5,
  flash: 10,
  cover: 11,
};
// The logo over the title, and up in the corner once the menu is showing.
const TITLE_LOGO = { x: W / 2, y: 150, scale: 1 };
const MENU_LOGO = { x: 352, y: 86, scale: 0.56 }; // clear of the sun, and of the signpost
const PAPER = 0xfff8e1; // the colour of the loading screen and the studio's sting

const smooth = (u: number) => u * u * (3 - 2 * u);

export class TitleScene extends Scene {
  private yard!: YardView;
  private logo!: Logo;
  private player!: PlayerView;
  private fx!: Fx;
  private cover!: GameObjects.Rectangle;
  private menuK = 0; // 0 = title, 1 = menu: how far the logo has moved up into the corner

  constructor(
    private app: App,
    private presenter: GamePresenter,
  ) {
    super('title');
  }

  create() {
    fitCamera(this);
    this.fx = new Fx(this, DEPTH.particles, DEPTH.flash);
    this.yard = new YardView(this, DEPTH);
    this.player = new PlayerView(this, DEPTH.player, this.fx);
    this.logo = new Logo(this, DEPTH.logo);
    this.cover = this.add.rectangle(W / 2, H / 2, W + 40, H + 40, PAPER).setDepth(DEPTH.cover);
    this.takeOver();
    this.events.on('wake', () => this.takeOver());
  }

  // This scene's effects are the ones the presenter drives now, starting clean.
  private takeOver() {
    this.fx.clear();
    this.presenter.fx = this.fx;
  }

  override update(_time: number, deltaMs: number) {
    const yard = this.app.level;
    if (!(yard instanceof Yard)) return; // a level is being played: its own scene draws it
    const dt = deltaMs / 1000;
    this.yard.sync(dt);
    this.player.setVisible(yard.shown);
    this.player.sync(yard, this.app.alpha, dt);

    const menu = yard.beat === 'menu' || yard.beat === 'leave';
    this.menuK = clamp(this.menuK + (menu ? dt : -dt) * 2.5, 0, 1);
    this.logo.sync(this.logoPose(yard));
    // the studio's paper, lifting off the yard as the opening begins
    const lift = yard.beat === 'sting' ? 0 : yard.beat === 'intro' ? clamp(yard.t / 0.6, 0, 1) : 1;
    this.cover.setAlpha(1 - lift).setVisible(lift < 1);
    this.fx.update(dt, dt);
  }

  private logoPose(yard: Yard): LogoPose {
    const k = smooth(this.menuK),
      lerp = (a: number, b: number) => a + (b - a) * k,
      shown = yard.beat === 'sting' ? 0 : yard.beat === 'intro' ? clamp((yard.t - 4.4) / 0.6, 0, 1) : 1;
    return {
      x: lerp(TITLE_LOGO.x, MENU_LOGO.x),
      y: lerp(TITLE_LOGO.y, MENU_LOGO.y),
      scale: lerp(TITLE_LOGO.scale, MENU_LOGO.scale),
      line1: shown,
      line2: shown,
      sprout: shown,
    };
  }
}
