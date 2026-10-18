// Hearts, the boss's bar, toasts and "Ready? GO!" (on a stage, its name and then "GO!"). It runs on top of
// the fight and stage scenes with its own camera, so screen shake does not move it. The parts are baked in
// src/game/hud/art.ts.
import { BlendModes, Scene, type GameObjects } from 'phaser';
import type { App, Played } from '../../app';
import { H, RES, TAU, W } from '../../config';
import type { ToastTone } from '../../presentation';
import { Fight } from '../../sim/fight';
import type { Player } from '../../sim/player';
import { Stage } from '../../sim/stage/stage';
import { clamp } from '../../sim/math';
import { INV, part, show, unit } from '../art/bake';
import { FONT } from '../art/draw';
import { fitCamera } from '../createGame';
import { BAR_H, BAR_W, FILL_H, FILL_W } from '../hud/art';
import { easeOutBack } from '../motion';
import type { GamePresenter } from '../presenter';

export { bakeHud } from '../hud/art';

const MAX_HEARTS = 8;
const BAR_X = W / 2 - BAR_W / 2 + 30,
  BAR_Y = 20;
const PHASE_COLOR = [0xffd23f, 0xffa42e, 0xff5f3c]; // the bar heats up with Sunny
// Every letter, digit and mark a toast might use.
const WARM_UP = 'Sphinx of black quartz, judge my vow! SUPER +1 ↑ ⬆ 0123456789';
const TONES: Record<ToastTone, { size: number; color: string; stroke: string }> = {
  info: { size: 22, color: '#ffffff', stroke: '#1f6b2f' },
  alert: { size: 27, color: '#fff4d6', stroke: '#b3331a' },
  good: { size: 24, color: '#ffffff', stroke: '#1f79a8' },
};
// Two quick thumps, then a rest: 0..1.
const heartbeat = (t: number) => {
  const u = (t * 1.5) % 1;
  return u < 0.5 ? Math.max(0, Math.sin(u * TAU * 2)) : 0;
};

// One coloured bar inside the boss's track: two round ends and a stretch of colour between them.
interface Fill {
  left: GameObjects.Image;
  mid: GameObjects.Image;
  right: GameObjects.Image;
}
const FILL_X = (BAR_W - FILL_W) / 2; // where the coloured bar starts inside the track

interface Heart {
  slot: GameObjects.Image; // the empty outline, always there
  full: GameObjects.Image;
  ghost: GameObjects.Image; // a heart that was just lost, puffing away
  was: boolean; // was full last frame
  gained: boolean; // the last change filled it (rather than emptied it)
  pop: number; // 1 -> 0 after it changes
}

export class HudScene extends Scene {
  private all!: GameObjects.Container;
  private danger!: GameObjects.Image;
  private hearts: Heart[] = [];
  private bar!: GameObjects.Container;
  private lagFill!: Fill; // pale: where the boss's health was a moment ago
  private hpFill!: Fill;
  private hitFill!: Fill; // white: flashes over the bar when a hit lands
  private barIcon!: GameObjects.Image;
  private bossName!: GameObjects.Text;
  // On a stage, instead of the boss's bar: the path to Sunny, Pip's head showing how far along it he is
  private path!: GameObjects.Container;
  private pathFill!: Fill;
  private pathPip!: GameObjects.Image;
  private stageName!: GameObjects.Text;
  private seeds: { slot: GameObjects.Image; seed: GameObjects.Image; had: boolean; pop: number }[] = [];
  private toastPlate!: GameObjects.Image;
  // One line of text per tone, each styled once. Text is drawn on a canvas of its own that has to be sent
  // to the graphics card again whenever it changes, and every change of style counts: restyling one line
  // for each toast sent it four times in a frame, enough to drop that frame.
  private toasts!: Record<ToastTone, GameObjects.Text>;
  private toastText!: GameObjects.Text; // the one showing
  private burst!: GameObjects.Image;
  private burstUnit = 1; // the rays are baked small: this is the scale that shows them at full size
  private ready!: GameObjects.Text;
  private go!: GameObjects.Text;
  private naps: GameObjects.Image[] = [];

  private seen: Played | null = null;
  private clock = 0;
  private toastT = 0; // seconds left
  private toastAge = 0;
  private toastTone: ToastTone = 'info';
  private lag = 1; // the pale part of the bar: where the boss's health was a moment ago
  private lagHold = 0;
  private shown = 1;
  private barShake = 0;
  private iconPop = 0;
  private prevPhase = 1;
  private dangerA = 0;
  private shownA = 1; // the whole HUD fades away under the win and lose cards

  constructor(
    private app: App,
    private presenter: GamePresenter,
  ) {
    super('hud');
  }

  create() {
    fitCamera(this);
    // resolution: text is drawn on its own canvas, which has to be as sharp as the zoomed camera
    const text = (size: number, weight: string, color: string, stroke: string, thickness: number) =>
      this.add.text(0, 0, '', {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: weight,
        color,
        stroke,
        strokeThickness: thickness,
        padding: { x: 6, y: 6 },
        resolution: RES,
      });
    // A drop shadow, for text that is drawn once and never changes. On a canvas a shadow is slow to
    // draw (4-13 ms for one line here against 1.5 ms without), so the toasts, which change during the
    // fight, go without: they have a dark patch behind them instead.
    const shadowed = (t: GameObjects.Text) => t.setShadow(0, 3, 'rgba(20,10,5,0.35)', 0, true, true);

    this.danger = part(this, 'vignette').setDisplaySize(W, H).setTint(0xff2850).setAlpha(0);
    for (let i = 0; i < MAX_HEARTS; i++)
      this.hearts.push({
        slot: part(this, 'heart-empty'),
        full: part(this, 'heart-full'),
        ghost: part(this, 'heart-full').setVisible(false),
        was: true,
        gained: false,
        pop: 0,
      });

    const fill = (): Fill => ({
      left: part(this, 'bar-cap'),
      mid: part(this, 'white'),
      right: part(this, 'bar-cap'),
    });
    this.lagFill = fill();
    this.hpFill = fill();
    this.hitFill = fill();
    this.barIcon = part(this, 'bar-icon-angry', -18, BAR_H / 2);
    this.bossName = shadowed(text(14, '600', '#ffffff', '#38200f', 4))
      .setOrigin(0, 0)
      .setPosition(16, BAR_H + 3);
    this.bar = this.add.container(BAR_X, BAR_Y, [
      part(this, 'bar-back'),
      ...[this.lagFill, this.hpFill, this.hitFill].flatMap((f) => [f.left, f.mid, f.right]),
      part(this, 'bar-gloss'),
      this.barIcon,
      this.bossName,
    ]);
    this.pathFill = fill();
    this.pathPip = part(this, 'hud-pip', FILL_X, BAR_H / 2);
    this.stageName = shadowed(text(14, '600', '#ffffff', '#1f6b2f', 4))
      .setOrigin(0, 0)
      .setPosition(16, BAR_H + 3);
    this.path = this.add.container(BAR_X, BAR_Y, [
      part(this, 'bar-back'),
      this.pathFill.left,
      this.pathFill.mid,
      this.pathFill.right,
      part(this, 'bar-gloss'),
      part(this, 'bar-icon-angry', BAR_W + 18, BAR_H / 2), // Sunny, waiting at the end of the path
      this.pathPip,
      this.stageName,
    ]);
    for (let i = 0; i < 3; i++)
      this.seeds.push({
        slot: part(this, 'seed-slot', 30 + i * 26, 74).setScale(INV * 0.7),
        seed: part(this, 'golden-seed', 30 + i * 26, 74).setVisible(false),
        had: false,
        pop: 0,
      });

    // centred over the open sky left of the boss, so it never covers the "!" warning bubble
    this.toastPlate = part(this, 'toast-plate', 400, 112);
    const line = (tone: ToastTone) =>
      text(TONES[tone].size, '700', TONES[tone].color, TONES[tone].stroke, 6)
        .setOrigin(0.5)
        .setPosition(400, 112)
        .setVisible(false);
    this.toasts = { info: line('info'), alert: line('alert'), good: line('good') };
    this.toastText = this.toasts.info;
    // The first thing a line of text ever draws costs several times what later ones do (the browser has
    // not drawn that typeface at that size yet). Pay that now, while the game is still starting, instead
    // of in the frame the first toast pops up.
    for (const toast of Object.values(this.toasts)) toast.setText(WARM_UP).setText('');
    this.burst = part(this, 'go-burst', W / 2, H / 2 - 50).setBlendMode(BlendModes.ADD);
    this.burstUnit = unit('go-burst');
    this.ready = shadowed(text(72, '700', '#ffffff', '#2f8a3a', 12))
      .setOrigin(0.5)
      .setText('Ready?');
    this.go = shadowed(text(96, '700', '#fff7c2', '#e8641c', 14))
      .setOrigin(0.5)
      .setText('GO!');
    for (let i = 0; i < 3; i++) this.naps.push(part(this, 'zzz'));

    this.all = this.add.container(0, 0, [
      this.danger,
      ...this.hearts.flatMap((h) => [h.slot, h.full, h.ghost]),
      ...this.seeds.flatMap((s) => [s.slot, s.seed]),
      this.bar,
      this.path,
      this.toastPlate,
      ...Object.values(this.toasts),
      this.burst,
      this.ready,
      this.go,
      ...this.naps,
    ]);
    this.presenter.hud = this;
  }

  toast(text: string, seconds = 2.4, tone: ToastTone = 'info') {
    this.toastText.setVisible(false);
    this.toastText = this.toasts[tone].setText(text); // redrawn only if the words have changed
    this.toastT = seconds;
    this.toastAge = 0;
    this.toastTone = tone;
  }
  clear() {
    this.toastT = 0;
  }

  // Not called while the game is paused.
  override update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000,
      level = this.app.level,
      p = level.player,
      fight = level instanceof Fight ? level : null,
      stage = level instanceof Stage ? level : null;
    this.clock += dt;
    const fresh = level !== this.seen; // a new level: nothing should animate as if it had just changed
    if (fresh) {
      this.seen = level;
      this.lag = this.shown = 1;
      this.prevPhase = fight?.boss.phase ?? 1;
      this.iconPop = this.barShake = 0;
      this.ready.setText(stage ? stage.name : 'Ready?'); // redrawn only when it changes
    }
    // The result cards sit over the middle of the screen, and the boss's bar would poke out above them.
    const result = level.state === 'win' || level.state === 'lose';
    this.shownA = fresh ? 1 : clamp(this.shownA + (result ? -dt : dt) * 5, 0, 1);
    this.all.setVisible(level.state !== 'title' && this.shownA > 0).setAlpha(this.shownA);
    const live =
      level.state === 'play' || level.state === 'ending' || level.state === 'down' || level.state === 'clear';

    this.syncHearts(dt, p, fresh);
    this.bar.setVisible(!!fight);
    if (fight) this.syncBar(dt, fight);
    this.path.setVisible(!!stage);
    for (const s of this.seeds) s.slot.setVisible(!!stage);
    if (stage) this.syncPath(dt, stage, fresh);
    else for (const s of this.seeds) s.seed.setVisible(false);

    // ---- toast ----
    if (live) {
      this.toastT -= dt;
      this.toastAge += dt;
    }
    const showing = live && this.toastT > 0,
      fade = clamp(this.toastT / 0.4, 0, 1),
      pop = this.toastAge < 0.25 ? easeOutBack(this.toastAge / 0.25) : 1,
      rattle = this.toastTone === 'alert' ? Math.max(0, 0.5 - this.toastAge) * 12 : 0;
    this.toastText
      .setVisible(showing)
      .setAlpha(fade)
      .setScale(pop)
      .setPosition(400 + (Math.random() - 0.5) * rattle, 112 - (1 - fade) * 8);
    this.toastPlate
      .setVisible(showing)
      .setAlpha(fade * 0.85)
      .setDisplaySize(this.toastText.width * pop + 110, 62);

    // ---- "Ready?" while the boss wakes up (on a stage, its name), then "GO!" ----
    const intro = fight ? fight.boss.state === 'intro' : !!stage && stage.t < 1.7,
      t = fight ? fight.boss.introT : (stage?.t ?? 0),
      isGo = t >= 0.9;
    this.ready.setVisible(intro && !isGo);
    this.go.setVisible(intro && isGo);
    this.burst.setVisible(intro && isGo);
    if (intro && !isGo) {
      const u = t / 0.9;
      this.ready
        .setPosition(W / 2, H / 2 - 50)
        .setScale(easeOutBack(Math.min(1, u * 3.2)) * (1 + Math.sin(this.clock * 9) * 0.015))
        .setRotation(-0.04 + Math.sin(this.clock * 5) * 0.012)
        .setAlpha(clamp(u * 6, 0, 1));
    } else if (intro) {
      const u = (t - 0.9) / 0.8,
        slam = 1 + 0.7 * Math.pow(Math.max(0, 1 - u * 5), 2); // lands big, settles fast
      this.go
        .setPosition(W / 2, H / 2 - 50)
        .setScale(slam)
        .setRotation(0.03)
        .setAlpha(clamp((1 - u) * 3, 0, 1));
      this.burst
        .setRotation(this.clock * 0.9)
        .setScale(this.burstUnit * (0.6 + u * 0.7))
        .setAlpha(clamp((1 - u) * 1.6, 0, 1) * 0.9);
    }

    // ---- Pip is napping ----
    const viewX = stage ? stage.camX : 0; // this scene does not scroll: a stage's camera has moved on
    this.naps.forEach((z, i) => {
      const u = (level.endT * 0.7 + i / 3) % 1;
      z.setVisible(level.state === 'down')
        .setScale(INV * (0.6 + u * 0.7))
        .setAlpha(Math.sin(u * Math.PI))
        .setPosition(p.x - viewX + 34 + u * 34, p.y - 44 - u * 44);
    });

    // ---- the last heart: red creeps in from the corners, in time with the heartbeat ----
    const scared = level.state === 'play' && p.hp === 1;
    this.dangerA += ((scared ? 1 : 0) - this.dangerA) * Math.min(1, dt * 4);
    this.danger.setVisible(this.dangerA > 0.01).setAlpha(this.dangerA * (0.42 + 0.3 * heartbeat(this.clock)));
  }

  private syncHearts(dt: number, p: Player, fresh: boolean) {
    const gap = p.maxHp > 5 ? 31 : 36;
    this.hearts.forEach((h, i) => {
      const full = i < p.hp,
        used = i < p.maxHp,
        x = 36 + i * gap,
        y = 36;
      if (fresh) {
        h.was = full;
        h.pop = 0;
      } else if (full !== h.was) {
        h.was = h.gained = full;
        h.pop = 1;
      }
      h.pop = Math.max(0, h.pop - dt * 2.4);
      // the last two hearts beat
      const beat = full && p.hp <= 2 && p.alive ? heartbeat(this.clock - i * 0.07) : 0;
      const rattle = !full && h.pop > 0.4 ? Math.sin(h.pop * 50) * 3 * h.pop : 0;
      h.slot.setVisible(used).setPosition(x + rattle, y);
      h.full
        .setVisible(used && full)
        .setPosition(x, y)
        .setScale(INV * (1 + beat * 0.14 + (h.gained ? Math.sin(h.pop * Math.PI) * 0.5 : 0)));
      const gone = 1 - h.pop;
      h.ghost
        .setVisible(used && !full && !h.gained && h.pop > 0)
        .setPosition(x, y - gone * 12)
        .setScale(INV * (1 + gone * 1.2))
        .setAlpha(h.pop * h.pop);
    });
  }

  // Pip's head travels along the path to Sunny, and the golden seeds found fill their places.
  private syncPath(dt: number, stage: Stage, fresh: boolean) {
    const k = stage.progress,
      moving = Math.abs(stage.player.vx) > 30;
    this.setFill(this.pathFill, k, 0x7fd65a, 1);
    this.pathPip
      .setPosition(FILL_X + k * FILL_W, BAR_H / 2 - (moving ? Math.abs(Math.sin(this.clock * 12)) * 3 : 0))
      .setRotation(moving ? Math.sin(this.clock * 12) * 0.08 : 0);
    if (this.stageName.text !== stage.name) this.stageName.setText(stage.name);
    this.seeds.forEach((s, i) => {
      const has = !!stage.seeds[i];
      if (fresh) s.had = has;
      else if (has && !s.had) {
        s.had = true;
        s.pop = 1;
      }
      s.pop = Math.max(0, s.pop - dt * 2);
      s.seed
        .setVisible(has)
        .setScale(INV * 0.7 * (1 + Math.sin(s.pop * Math.PI) * 0.6))
        .setRotation(Math.sin(s.pop * Math.PI * 3) * 0.3 * s.pop);
    });
  }

  private syncBar(dt: number, fight: Fight) {
    const b = fight.boss,
      k = b.hp / b.maxHp;
    if (k < this.shown) {
      this.lagHold = 0.3; // the pale bar waits a moment, then slides down to meet the real one
      this.barShake = 1;
    }
    this.shown = k;
    this.lagHold -= dt;
    if (this.lagHold <= 0) this.lag += (k - this.lag) * Math.min(1, dt * 6);
    if (this.lag < k) this.lag = k;
    this.barShake = Math.max(0, this.barShake - dt * 9);
    if (b.phase !== this.prevPhase) {
      this.prevPhase = b.phase;
      this.iconPop = 1;
    }
    this.iconPop = Math.max(0, this.iconPop - dt * 1.4);

    this.setFill(this.lagFill, this.lag, 0xfff3cf, 0.95);
    this.setFill(this.hpFill, k, PHASE_COLOR[Math.min(b.phase, 3) - 1], 1);
    this.setFill(this.hitFill, k, 0xffffff, (b.flash / 0.12) * 0.6);

    this.bar.setPosition(
      BAR_X + (Math.random() - 0.5) * 5 * this.barShake,
      BAR_Y + (Math.random() - 0.5) * 3 * this.barShake,
    );
    show(this.barIcon, b.alive ? 'bar-icon-angry' : 'bar-icon-joy');
    this.barIcon
      .setScale(INV * (1 + Math.sin(this.iconPop * Math.PI) * 0.5 + (b.alive ? 0 : 0.12)))
      .setRotation(
        b.alive ? Math.sin(this.clock * 40) * 0.2 * this.iconPop : Math.sin(this.clock * 4) * 0.15,
      );
    if (this.bossName.text !== b.name) this.bossName.setText(b.name);
  }

  // Show `frac` of the track in one colour. The ends are half-discs; a bar shorter than it is tall
  // squeezes them, so it stays rounded all the way down to nothing.
  private setFill(f: Fill, frac: number, color: number, alpha: number) {
    const w = FILL_W * frac,
      on = w > 0.5 && alpha > 0;
    f.left.setVisible(on);
    f.mid.setVisible(on);
    f.right.setVisible(on);
    if (!on) return;
    const r = Math.min(FILL_H / 2, w / 2),
      squeeze = (INV * r) / (FILL_H / 2),
      y = BAR_H / 2;
    f.left
      .setPosition(FILL_X + r, y)
      .setScale(-squeeze, INV)
      .setTint(color)
      .setAlpha(alpha);
    f.right
      .setPosition(FILL_X + w - r, y)
      .setScale(squeeze, INV)
      .setTint(color)
      .setAlpha(alpha);
    // the stretch overlaps each end by a quarter pixel, so no seam can show between them
    f.mid
      .setPosition(FILL_X + r - 0.25, y - FILL_H / 2)
      .setDisplaySize(w - 2 * r + 0.5, FILL_H)
      .setTint(color)
      .setAlpha(alpha);
  }
}
