// Draws Pip's yard behind the opening, the title and the main menu. The App advances the yard (src/sim/yard.ts);
// every frame this scene makes the views match it. Everything the opening animates is worked out from the
// yard's beat and how far into it the yard is, so skipping the opening puts everything in its final place by
// itself. The opening, second by second (INTRO in yard.ts):
//   the studio's sting on the loading screen's paper, then an iris opening from its sprout onto the dawn,
//   the camera close on the sky as the sun wakes and rises and the stars go out, the camera pulling back onto
//   the yard as the flowers open along the path, the door swinging open and Pip hopping out, and the logo:
//   the first line dropping in, the second stamping down under it, the sprout growing out of the first.
// People who ask their device for less motion get fades instead of the camera moves, the iris and the drops.
import { Scene, type GameObjects } from 'phaser';
import type { App } from '../../app';
import { GROUND, H, STEP, W } from '../../config';
import { clamp, lerp } from '../../sim/math';
import { INTRO, LEAVE, LOGO_DROP, Yard, type YardBeat } from '../../sim/yard';
import { fitCamera } from '../createGame';
import { Fx } from '../fx';
import { easeOutBack } from '../motion';
import type { GamePresenter } from '../presenter';
import { Iris, IRIS_OPEN } from '../views/Iris';
import { PlayerView } from '../views/PlayerView';
import { LOGO_S } from '../views/title/art';
import { LINE_AT_REST, Logo, type LinePose, type LogoPose } from '../views/title/Logo';
import { Sting } from '../views/title/Sting';
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
  screen: 11, // the iris and the sting, fixed to the screen however the camera moves
};
// The logo over the title, and up beside the sun once the menu is showing.
const TITLE_LOGO = { x: W / 2, y: 150, scale: 1 };
const MENU_LOGO = { x: 352, y: 86, scale: 0.56 }; // clear of the sun, and of the signpost
const PAPER = 0xfff8e1; // the colour of the loading screen and the studio's sting
const NIGHT = 0x123f2c; // the iris that closes on Pip as he sets off: the dark green around the game
// The camera in the opening: close on the sky as the sun rises, then pulled back onto the whole yard.
const CLOSE = { x: 342, y: 196, zoom: 1.45 };
const WIDE = { x: W / 2, y: H / 2, zoom: 1 };
const PULL = 1.4; // seconds the pull-back takes
const RISE = 250; // how far below its place the sun starts, behind the hills
const AWAKE = 1.7; // the sun opens its eyes
const DAWN = 1; // the dawn holds this long, then the morning light comes
const BLOOM = { from: 2.6, across: 0.8, pop: 0.28 }; // the flowers open left to right as the light reaches them
const DOOR = { open: 0.22, close: 4.25, shut: 0.25, swing: 1.9 };
const PETALS = ['#ff8fb1', '#ffd23f', '#ffffff', '#b48cff', '#8fd8ff'];
const DOOR_DUST = {
  n: 5,
  shape: 'puff',
  color: '#f4ead0',
  speed: 60,
  size: 6,
  life: 0.4,
  gravity: -30,
  dir: -Math.PI / 2,
  spread: 2.6,
  alpha: 0.7,
} as const;

const smooth = (u: number) => u * u * (3 - 2 * u);
const easeOut = (u: number) => 1 - (1 - u) ** 3;
// A line that has just landed squashes and wobbles back: 0 at rest.
const wobble = (since: number, amount: number, rate = 11) =>
  since < 0 ? 0 : amount * Math.exp(-since * rate) * Math.cos(since * 26);

export class TitleScene extends Scene {
  private yard!: YardView;
  private logo!: Logo;
  private player!: PlayerView;
  private fx!: Fx;
  private iris!: Iris;
  private sting!: Sting;
  private screenLayer!: GameObjects.Container;
  private gentle = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private menuK = 0; // 0 = title, 1 = menu: how far the logo has moved up into the corner
  private clock = 0;
  private seen: Yard | null = null;
  private was: { beat: YardBeat; t: number } = { beat: 'sting', t: 0 };
  private popped = new Set<number>(); // the flowers that have opened in this opening

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
    this.screenLayer = this.add.container(0, 0).setDepth(DEPTH.screen);
    this.iris = new Iris(this, 0, this.screenLayer);
    this.sting = new Sting(this, 0, this.gentle, this.screenLayer);
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
    this.clock += dt;
    if (yard !== this.seen) this.reset(yard);
    // the yard's clock between its steps, so the opening moves smoothly on any display
    const beat = yard.beat,
      t = yard.t + (this.app.alpha - 1) * STEP,
      opening = beat === 'sting' || beat === 'intro',
      intro = beat === 'intro' ? t : beat === 'sting' ? -1 : Infinity; // seconds into the cold open
    const crossed = (at: number) =>
      beat === 'intro' && this.was.beat === 'intro' && this.was.t < at && t >= at;

    // ---- the light: dawn, then a clear morning as the sun comes up ----
    if (intro < DAWN) {
      if (this.yard.weather.weight.dawn < 1) this.yard.snapWeather('dawn');
    } else if (yard.skipped && beat === 'press' && this.was.beat !== 'press') {
      this.yard.snapWeather('calm'); // skipped: straight to the morning, under a flash of light
      this.fx.flash(0.55, '#fff8e1');
    } else this.yard.weather.update('calm', opening ? dt * 0.7 : dt); // the morning comes slowly
    const sunUp = this.gentle ? 1 : easeOut(clamp((intro - INTRO.sunrise) / 1.7, 0, 1));
    this.yard.sync(dt, intro < AWAKE ? 'sleepy' : 'happy', RISE * (1 - sunUp));
    this.yard.stars.forEach((star, i) => {
      const out = clamp((intro - 0.4 - i * 0.09) / 0.4, 0, 1);
      star.setVisible(out < 1).setAlpha((0.6 + 0.4 * Math.sin(this.clock * 3 + i * 1.7)) * (1 - out));
    });
    if (crossed(AWAKE))
      this.fx.burst(132, 92, {
        n: 8,
        shape: 'star',
        color: '#fff6c8',
        glow: true,
        speed: 90,
        size: 7,
        gravity: 0,
      });

    // ---- the camera: close on the sky, then pulled back onto the yard ----
    const pull = this.gentle ? 1 : smooth(clamp((intro - INTRO.pullBack) / PULL, 0, 1));
    const cam = {
      x: lerp(CLOSE.x, WIDE.x, pull),
      y: lerp(CLOSE.y, WIDE.y, pull),
      zoom: lerp(CLOSE.zoom, WIDE.zoom, pull),
    };
    // the iris and the sting stay put on the screen whatever the camera does
    this.screenLayer.setPosition(cam.x - W / 2 / cam.zoom, cam.y - H / 2 / cam.zoom).setScale(1 / cam.zoom);

    this.bloom(intro, opening);
    this.syncDoor(intro);
    if (crossed(DOOR.close + DOOR.shut)) this.fx.burst(this.yard.doorX, GROUND - 4, DOOR_DUST);

    this.player.setVisible(yard.shown);
    this.player.sync(yard, this.app.alpha, dt);

    // ---- the logo ----
    const menu = beat === 'menu' || beat === 'leave';
    this.menuK = clamp(this.menuK + (menu ? dt : -dt) * 2.5, 0, 1);
    this.logo.sync(this.logoPose(intro));
    if (crossed(INTRO.stamp) && !this.gentle) {
      this.fx.punch(0.035);
      this.fx.shake(3);
      this.fx.burst(TITLE_LOGO.x, TITLE_LOGO.y + 70 * LOGO_S, {
        n: 14,
        shape: 'leaf',
        colors: ['#7cc644', '#9ad85f', '#5aa83a'],
        speed: 260,
        size: 9,
        life: 1.1,
        gravity: 260,
        dir: -Math.PI / 2,
        spread: 2.8,
      });
    }
    if (crossed(INTRO.stamp + 0.55))
      this.fx.burst(TITLE_LOGO.x - 144 * LOGO_S, TITLE_LOGO.y - 74 * LOGO_S, {
        n: 7,
        shape: 'star',
        color: '#fff6c8',
        glow: true,
        speed: 70,
        size: 6,
        gravity: 0,
      });

    // ---- the sting, and the iris: opening from the sting's sprout onto the dawn, closing on Pip at Play ----
    this.sting.setVisible(beat === 'sting' || (beat === 'intro' && t < 0.3));
    if (beat === 'sting') this.sting.sync(t);
    else if (beat === 'intro') this.sting.sync(Infinity, t);
    if (beat === 'sting') this.iris.set(W / 2, H / 2, 0, PAPER);
    else if (beat === 'intro' && t < INTRO.open) {
      const u = clamp(t / INTRO.open, 0, 1);
      if (this.gentle) this.iris.set(W / 2, H / 2, 0, PAPER, 1 - u);
      else this.iris.set(this.sting.sproutX, this.sting.sproutY, IRIS_OPEN * u ** 2.2, PAPER);
    } else if (beat === 'leave') {
      // closing on Pip as he runs: down to a ring round him, a moment's pause, then shut
      const u = clamp((t - 0.25) / (LEAVE - 0.25), 0, 1),
        p = yard.player,
        ring = 52,
        r =
          u < 0.7 ? lerp(IRIS_OPEN, ring, smooth(u / 0.7)) : u < 0.85 ? ring : ring * (1 - (u - 0.85) / 0.15);
      if (this.gentle) this.iris.set(W / 2, H / 2, 0, NIGHT, u);
      else this.iris.set(p.x, p.y - 28, r, NIGHT);
    } else this.iris.set(0, 0, IRIS_OPEN, PAPER);

    this.fx.update(dt, dt, cam.x, cam.y, cam.zoom);
    this.was = { beat, t };
  }

  // A new visit to the yard: from the opening, or back to the menu from a level.
  private reset(yard: Yard) {
    this.seen = yard;
    this.popped.clear();
    this.menuK = yard.beat === 'menu' ? 1 : 0;
    this.was = { beat: yard.beat, t: yard.t };
    if (yard.beat === 'menu') this.yard.snapWeather('calm');
  }

  // The flowers along the path: shut in the dawn, opening left to right as the light reaches them.
  private bloom(intro: number, opening: boolean) {
    for (const [i, f] of this.yard.flowers.entries()) {
      const k = opening ? clamp((intro - BLOOM.from - (f.x / W) * BLOOM.across) / BLOOM.pop, 0, 1) : 1;
      f.image.setScale(f.size * (this.gentle ? k : easeOutBack(k))).setVisible(k > 0);
      if (opening && k > 0 && !this.popped.has(i)) {
        this.popped.add(i);
        this.fx.burst(f.x, GROUND - 14, {
          n: 4,
          shape: 'petal',
          colors: PETALS,
          speed: 70,
          size: 5,
          life: 0.7,
          gravity: 70,
          dir: -Math.PI / 2,
          spread: 2.2,
        });
      }
    }
  }

  // The cottage's door swings open for Pip, and shut behind him.
  private syncDoor(intro: number) {
    const opening = clamp((intro - INTRO.door) / DOOR.open, 0, 1),
      closing = clamp((intro - DOOR.close) / DOOR.shut, 0, 1),
      swing = intro === Infinity ? 0 : DOOR.swing * (easeOut(opening) - closing * closing),
      ajar = swing > 0.02;
    this.yard.doorway.setVisible(ajar);
    this.yard.door
      .setVisible(ajar)
      .setScale(this.yard.doorScale * Math.max(-0.45, Math.cos(swing)), this.yard.doorScale);
  }

  private logoPose(intro: number): LogoPose {
    const k = smooth(this.menuK),
      bob = Math.sin(this.clock * 1.6) * 3 * (1 - k),
      base = {
        x: lerp(TITLE_LOGO.x, MENU_LOGO.x, k),
        y: lerp(TITLE_LOGO.y, MENU_LOGO.y, k) + bob,
        scale: lerp(TITLE_LOGO.scale, MENU_LOGO.scale, k),
        tilt: Math.sin(this.clock * 1.3) * 0.012 * (1 - k),
      };
    if (intro === Infinity) return { ...base, line1: LINE_AT_REST, line2: LINE_AT_REST, sprout: 1 };
    const t1 = intro - INTRO.logo,
      t2 = intro - (INTRO.stamp - 0.16),
      sprout = clamp((intro - INTRO.stamp - 0.12) / 0.45, 0, 1);
    if (this.gentle) {
      const fade = (u: number) => ({ ...LINE_AT_REST, alpha: clamp(u / 0.5, 0, 1) });
      return { ...base, line1: fade(t1), line2: fade(t2), sprout };
    }
    // the first line falls in and squashes on landing; it hops when the second stamps down under it
    const fall = clamp(t1 / LOGO_DROP, 0, 1),
      d1 = wobble(t1 - LOGO_DROP, 0.22),
      hop = Math.max(0, Math.sin(Math.PI * clamp((intro - INTRO.stamp) / 0.25, 0, 1))) * 12;
    const line1: LinePose = {
      dy: -330 * (1 - fall * fall) - hop,
      sx: 1 + d1,
      sy: 1 - d1,
      alpha: t1 < 0 ? 0 : clamp(t1 / 0.06, 0, 1),
    };
    // the second comes down out of the screen, big, and lands with a thump
    const stamp = clamp(t2 / 0.16, 0, 1),
      d2 = wobble(t2 - 0.16, 0.16, 10),
      size = 2 - stamp * stamp;
    const line2: LinePose = {
      dy: 0,
      sx: size * (1 + d2),
      sy: size * (1 - d2),
      alpha: t2 < 0 ? 0 : stamp,
    };
    return { ...base, line1, line2, sprout };
  }
}
