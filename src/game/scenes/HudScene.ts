// Hearts, the boss's bar, toasts and "Ready? GO!". It runs on top of the fight scene with its own camera,
// so screen shake does not move it. The parts are baked in src/game/hud/art.ts.
import { BlendModes, Scene, type GameObjects } from 'phaser';
import type { App } from '../../app';
import { H, RES, TAU, W } from '../../config';
import type { ToastTone } from '../../presentation';
import type { Fight } from '../../sim/fight';
import { clamp } from '../../sim/math';
import { INV, part, show } from '../art/bake';
import { fitCamera } from '../createGame';
import { BAR_H, BAR_W } from '../hud/art';
import type { GamePresenter } from '../presenter';

export { bakeHud } from '../hud/art';

const MAX_HEARTS = 8;
const BAR_X = W / 2 - BAR_W / 2 + 30,
  BAR_Y = 20;
const FONT = 'Fredoka, sans-serif';
const PHASE_COLOR = [0xffd23f, 0xffa42e, 0xff5f3c]; // the bar heats up with Sunny
const TONES: Record<ToastTone, { size: number; color: string; stroke: string }> = {
  info: { size: 22, color: '#ffffff', stroke: '#1f6b2f' },
  alert: { size: 27, color: '#fff4d6', stroke: '#b3331a' },
  good: { size: 24, color: '#ffffff', stroke: '#1f79a8' },
};
const easeOutBack = (u: number) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
// Two quick thumps, then a rest: 0..1.
const heartbeat = (t: number) => {
  const u = (t * 1.5) % 1;
  return u < 0.5 ? Math.max(0, Math.sin(u * TAU * 2)) : 0;
};

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
  private barFill!: GameObjects.Graphics;
  private barIcon!: GameObjects.Image;
  private bossName!: GameObjects.Text;
  private toastPlate!: GameObjects.Image;
  private toastText!: GameObjects.Text;
  private burst!: GameObjects.Image;
  private ready!: GameObjects.Text;
  private go!: GameObjects.Text;
  private naps: GameObjects.Image[] = [];

  private seen: Fight | null = null;
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
      this.add
        .text(0, 0, '', {
          fontFamily: FONT,
          fontSize: `${size}px`,
          fontStyle: weight,
          color,
          stroke,
          strokeThickness: thickness,
          padding: { x: 6, y: 6 },
          resolution: RES,
        })
        .setShadow(0, 3, 'rgba(20,10,5,0.35)', 0, true, true);

    this.danger = part(this, 'hud-danger').setDisplaySize(W, H).setAlpha(0);
    for (let i = 0; i < MAX_HEARTS; i++)
      this.hearts.push({
        slot: part(this, 'heart-empty'),
        full: part(this, 'heart-full'),
        ghost: part(this, 'heart-full').setVisible(false),
        was: true,
        gained: false,
        pop: 0,
      });

    this.barFill = this.add.graphics();
    this.barIcon = part(this, 'bar-icon-angry', -18, BAR_H / 2);
    this.bossName = text(14, '600', '#ffffff', '#38200f', 4)
      .setOrigin(0, 0)
      .setPosition(16, BAR_H + 3);
    this.bar = this.add.container(BAR_X, BAR_Y, [
      part(this, 'bar-back'),
      this.barFill,
      part(this, 'bar-gloss'),
      this.barIcon,
      this.bossName,
    ]);

    // centred over the open sky left of the boss, so it never covers the "!" warning bubble
    this.toastPlate = part(this, 'toast-plate', 400, 112);
    this.toastText = text(22, '700', '#fff', '#1f6b2f', 6).setOrigin(0.5).setPosition(400, 112);
    this.burst = part(this, 'go-burst', W / 2, H / 2 - 50).setBlendMode(BlendModes.ADD);
    this.ready = text(72, '700', '#ffffff', '#2f8a3a', 12).setOrigin(0.5).setText('Ready?');
    this.go = text(96, '700', '#fff7c2', '#e8641c', 14).setOrigin(0.5).setText('GO!');
    for (let i = 0; i < 3; i++) this.naps.push(part(this, 'zzz'));

    this.all = this.add.container(0, 0, [
      this.danger,
      ...this.hearts.flatMap((h) => [h.slot, h.full, h.ghost]),
      this.bar,
      this.toastPlate,
      this.toastText,
      this.burst,
      this.ready,
      this.go,
      ...this.naps,
    ]);
    this.presenter.hud = this;
  }

  toast(text: string, seconds = 2.4, tone: ToastTone = 'info') {
    const look = TONES[tone];
    this.toastText.setText(text).setFontSize(look.size).setColor(look.color).setStroke(look.stroke, 6);
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
      fight = this.app.fight,
      p = fight.player,
      b = fight.boss;
    this.clock += dt;
    const fresh = fight !== this.seen; // a new fight: nothing should animate as if it had just changed
    if (fresh) {
      this.seen = fight;
      this.lag = this.shown = 1;
      this.prevPhase = b.phase;
      this.iconPop = this.barShake = 0;
    }
    this.all.setVisible(fight.state !== 'title');
    const live = fight.state === 'play' || fight.state === 'ending' || fight.state === 'down';

    this.syncHearts(dt, fight, fresh);
    this.syncBar(dt, fight);

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

    // ---- "Ready?" while the boss wakes up, then "GO!" ----
    const intro = b.state === 'intro',
      t = b.introT,
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
        .setScale(0.6 + u * 0.7)
        .setAlpha(clamp((1 - u) * 1.6, 0, 1) * 0.9);
    }

    // ---- Pip is napping ----
    this.naps.forEach((z, i) => {
      const u = (fight.endT * 0.7 + i / 3) % 1;
      z.setVisible(fight.state === 'down')
        .setScale(INV * (0.6 + u * 0.7))
        .setAlpha(Math.sin(u * Math.PI))
        .setPosition(p.x + 34 + u * 34, p.y - 44 - u * 44);
    });

    // ---- the last heart: red creeps in from the corners, in time with the heartbeat ----
    const scared = fight.state === 'play' && p.hp === 1;
    this.dangerA += ((scared ? 1 : 0) - this.dangerA) * Math.min(1, dt * 4);
    this.danger.setVisible(this.dangerA > 0.01).setAlpha(this.dangerA * (0.42 + 0.3 * heartbeat(this.clock)));
  }

  private syncHearts(dt: number, fight: Fight, fresh: boolean) {
    const p = fight.player,
      gap = p.maxHp > 5 ? 31 : 36;
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

    const span = BAR_W - 5,
      h = BAR_H - 5,
      g = this.barFill.clear();
    const bar = (frac: number, color: number, alpha: number) => {
      const w = span * frac;
      if (w > 0.5) g.fillStyle(color, alpha).fillRoundedRect(2.5, 2.5, w, h, Math.min(h / 2, w / 2));
    };
    bar(this.lag, 0xfff3cf, 0.95);
    bar(k, PHASE_COLOR[Math.min(b.phase, 3) - 1], 1);
    if (b.flash > 0) bar(k, 0xffffff, (b.flash / 0.12) * 0.6);

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
}
