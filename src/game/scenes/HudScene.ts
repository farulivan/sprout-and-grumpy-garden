// Hearts, the boss's bar, toasts and "Ready? GO!". It runs on top of the fight scene with its own camera,
// so screen shake does not move it.
import { Scene, type GameObjects } from 'phaser';
import type { App } from '../../app';
import { H, RES, TAU, W } from '../../config';
import { clamp } from '../../sim/math';
import { bake, INV, part } from '../art/bake';
import { circle, ellipse, fillStroke, heart, roundRect } from '../art/draw';
import { fitCamera } from '../createGame';
import type { GamePresenter } from '../presenter';

const MAX_HEARTS = 8;
const BAR_W = 380,
  BAR_X = W / 2 - BAR_W / 2 + 30,
  BAR_Y = 22;
const FONT = 'Fredoka, sans-serif';

export function bakeHud(scene: Scene) {
  bake(scene, 'heart-full', 32, 30, 16, 16, (c) => {
    heart(c, 0, 0, 12);
    fillStroke(c, '#ff6f91', '#c9405f', 3);
  });
  bake(scene, 'heart-empty', 32, 30, 16, 16, (c) => {
    heart(c, 0, 0, 12);
    fillStroke(c, 'rgba(255,255,255,0.5)', 'rgba(120,80,80,0.5)', 3);
  });
  bake(scene, 'bar-frame', BAR_W + 6, 26, 3, 3, (c) => {
    roundRect(c, 0, 0, BAR_W, 20, 10);
    fillStroke(c, 'rgba(255,255,255,0.7)', '#4d9a3f', 3);
  });
  // little sunflower at the left end of the bar
  bake(scene, 'bar-icon', 44, 44, 22, 22, (c) => {
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i / 8) * TAU);
      ellipse(c, 13, 0, 7, 4);
      fillStroke(c, '#ffd23f', '#d98f1a', 1.5);
      c.restore();
    }
    circle(c, 0, 0, 8);
    fillStroke(c, '#8a5a2b', '#5a381a', 2);
  });
}

export class HudScene extends Scene {
  private all!: GameObjects.Container;
  private hearts: GameObjects.Image[] = [];
  private barFill!: GameObjects.Graphics;
  private bossName!: GameObjects.Text;
  private toastText!: GameObjects.Text;
  private ready!: GameObjects.Text;
  private go!: GameObjects.Text;
  private naps: GameObjects.Image[] = [];
  private toastT = 0;
  private clock = 0;

  constructor(
    private app: App,
    private presenter: GamePresenter,
  ) {
    super('hud');
  }

  create() {
    fitCamera(this);
    // resolution: text is drawn on its own canvas, which has to be as sharp as the zoomed camera
    const text = (size: number, weight: string, color: string, stroke?: string, thickness = 0) =>
      this.add.text(0, 0, '', {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: weight,
        color,
        stroke,
        strokeThickness: thickness,
        padding: { x: 4, y: 4 },
        resolution: RES,
      });

    for (let i = 0; i < MAX_HEARTS; i++) this.hearts.push(part(this, 'heart-full'));
    this.barFill = this.add.graphics();
    this.bossName = text(15, '600', '#4b3b2f')
      .setOrigin(0, 1)
      .setPosition(BAR_X + 2, BAR_Y + 45);
    // centred over the open sky left of the boss, so it never covers the "!" warning bubble
    this.toastText = text(22, '700', '#fff', '#4d9a3f', 5).setOrigin(0.5).setPosition(400, 110);
    this.ready = text(64, '700', '#fff', '#4d9a3f', 10).setOrigin(0.5).setText('Ready?');
    this.go = text(64, '700', '#fff', '#e0762e', 10).setOrigin(0.5).setText('GO!');
    for (let i = 0; i < 3; i++) this.naps.push(part(this, 'zzz'));

    this.all = this.add.container(0, 0, [
      ...this.hearts,
      part(this, 'bar-frame', BAR_X, BAR_Y),
      this.barFill,
      part(this, 'bar-icon', BAR_X - 22, BAR_Y + 10),
      this.bossName,
      this.toastText,
      this.ready,
      this.go,
      ...this.naps,
    ]);
    this.presenter.hud = this;
  }

  toast(text: string, seconds = 2.4) {
    this.toastText.setText(text);
    this.toastT = seconds;
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
    this.all.setVisible(fight.state !== 'title');
    if (fight.state === 'play' || fight.state === 'ending' || fight.state === 'down') this.toastT -= dt;

    // hearts: the last two beat
    const gap = p.maxHp > 5 ? 30 : 34;
    this.hearts.forEach((h, i) => {
      const full = i < p.hp,
        pulse = full && p.hp <= 2 ? 1 + Math.sin(this.clock * 8) * 0.08 : 1;
      h.setVisible(i < p.maxHp)
        .setTexture(full ? 'heart-full' : 'heart-empty')
        .setPosition(34 + i * gap, 34)
        .setScale(INV * pulse);
    });

    // boss bar
    const k = b.hp / b.maxHp,
      w = (BAR_W - 6) * k;
    this.barFill.clear();
    if (k > 0)
      this.barFill
        .fillStyle(k > 0.66 ? 0xffd23f : k > 0.33 ? 0xffb52e : 0xff7f50)
        .fillRoundedRect(BAR_X + 3, BAR_Y + 3, w, 14, Math.min(7, w / 2));
    if (this.bossName.text !== b.name) this.bossName.setText(b.name);

    this.toastText.setVisible(this.toastT > 0).setAlpha(clamp(this.toastT, 0, 1));

    // "Ready?" while the boss wakes up, then "GO!"
    const intro = b.state === 'intro',
      t = b.introT,
      isGo = t >= 0.9;
    this.ready.setVisible(intro && !isGo);
    this.go.setVisible(intro && isGo);
    if (intro) {
      const u = isGo ? (t - 0.9) / 0.8 : t / 0.9;
      const scale = isGo ? 1 + Math.max(0, 0.35 - u * 0.8) : 0.85 + 0.15 * Math.min(1, u * 2);
      (isGo ? this.go : this.ready)
        .setPosition(W / 2, H / 2 - 50)
        .setScale(scale)
        .setAlpha(clamp(isGo ? (1 - u) * 3 : u * 3, 0, 1));
    }

    // Pip is napping
    this.naps.forEach((z, i) =>
      z
        .setVisible(fight.state === 'down')
        .setScale((INV * 24) / 26)
        .setPosition(p.x + 30 + i * 16, p.y - 60 - ((fight.endT * 0.8 + i * 0.3) % 1) * 30),
    );
  }
}
