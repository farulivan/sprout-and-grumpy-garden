// The small enemies on a stage, each acting out what the simulation says it is doing: a Grumbud waddles on
// its root feet, a Puffball bobs and fluffs, a Pea Pod swells under its "!" and gapes as it spits, a Snapper
// rumbles in its mound, snaps up chomping and ducks back down. Every hit flashes white. Their parts are baked
// in enemies/art.ts; the "!" is the same badge the boss's hazards use.
import { TintModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import { lerp } from '../../sim/math';
import type { Enemy } from '../../sim/stage/enemies/enemy';
import { PEA_WARN, type PeaPod } from '../../sim/stage/enemies/peaPod';
import { SNAP_DOWN, SNAP_UP, SNAP_WARN, type Snapper } from '../../sim/stage/enemies/snapper';
import { INV, part, show } from '../art/bake';
import { easeOutBack } from '../motion';
import { faceKey } from './faces';
import { showMark } from './HazardViews';
import { ViewPool, type PooledView } from './pool';

export { bakeEnemies } from './enemies/art';

const SNAP_HEAD = 1.25; // the Snapper's head is drawn a size up, so its jaws read from across the screen

interface EnemyView extends PooledView {
  sync(e: Enemy, alpha: number, dt: number): void;
}

// The white flash over a set of parts while the enemy is still flinching from a hit.
class Flash {
  private on = false;
  constructor(private parts: GameObjects.Image[]) {}
  sync(flash: number) {
    const hit = flash > 0;
    if (hit === this.on) return;
    this.on = hit;
    for (const img of this.parts)
      if (hit) img.setTint(0xffffff).setTintMode(TintModes.FILL);
      else img.clearTint();
  }
}

// Blinks now and then, like Pip and the sun.
class Blink {
  private t = 1 + Math.random() * 3;
  closed(dt: number) {
    this.t -= dt;
    if (this.t < -0.12) this.t = 2 + Math.random() * 3;
    return this.t < 0;
  }
}

class GrumbudView implements EnemyView {
  private root: GameObjects.Container;
  private shadow: GameObjects.Image;
  private body: GameObjects.Image;
  private face: GameObjects.Image;
  private feet: GameObjects.Image[];
  private flash: Flash;
  private blink = new Blink();
  private walk = Math.random() * 6;
  private squash = 0;
  private lastFlash = 0;

  constructor(scene: Scene, depth: number) {
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.feet = [part(scene, 'grumbud-foot', -7, -3), part(scene, 'grumbud-foot', 7, -3)];
    this.body = part(scene, 'grumbud-body', 0, -6);
    this.face = part(scene, faceKey('grumbud', 'angry'), 2, -22);
    this.root = scene.add.container(0, 0, [...this.feet, this.body, this.face]).setDepth(depth);
    this.flash = new Flash([...this.feet, this.body, this.face]);
  }
  setVisible(visible: boolean) {
    this.root.setVisible(visible);
    this.shadow.setVisible(visible);
  }
  sync(e: Enemy, alpha: number, dt: number) {
    const x = lerp(e.px, e.x, alpha),
      y = lerp(e.py, e.y, alpha),
      moving = e.x !== e.px;
    if (moving) this.walk += dt * 11;
    if (e.flash > this.lastFlash) this.squash = 1;
    this.lastFlash = e.flash;
    this.squash = Math.max(0, this.squash - dt * 6);
    const bob = moving ? Math.abs(Math.sin(this.walk)) * 2.6 : Math.sin(e.t * 3) * 0.8;
    this.root.setPosition(x, y).setScale(e.facing * (1 + this.squash * 0.16), 1 - this.squash * 0.14);
    this.feet.forEach((foot, i) => {
      const swing = this.walk + i * Math.PI;
      foot.setPosition(
        (i ? 7 : -7) + (moving ? Math.sin(swing) * 4 : 0),
        -3 - (moving ? Math.max(0, Math.cos(swing)) * 3 : 0),
      );
    });
    this.body.setY(-6 - bob).setRotation(moving ? Math.sin(this.walk) * 0.06 : Math.sin(e.t * 2) * 0.03);
    this.face.setY(-22 - bob);
    show(this.face, faceKey('grumbud', 'angry', this.blink.closed(dt)));
    this.shadow.setPosition(x, y + 2).setScale(0.8, 0.8);
    this.flash.sync(e.flash);
  }
}

class PuffballView implements EnemyView {
  private shadow: GameObjects.Image;
  private head: GameObjects.Image;
  private face: GameObjects.Image;
  private flash: Flash;
  private blink = new Blink();

  constructor(scene: Scene, depth: number) {
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.head = part(scene, 'puff-head').setDepth(depth);
    this.face = part(scene, faceKey('puff', 'angry')).setDepth(depth);
    this.flash = new Flash([this.head, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.shadow, this.head, this.face]) img.setVisible(visible);
  }
  sync(e: Enemy, alpha: number, dt: number) {
    const x = lerp(e.px, e.x, alpha),
      y = lerp(e.py, e.y, alpha);
    this.head
      .setPosition(x, y)
      .setRotation(Math.sin(e.t * 1.3) * 0.12)
      .setScale(INV * (1 + Math.sin(e.t * 4) * 0.035));
    this.face.setPosition(x + e.facing * 2.5, y + 1);
    show(this.face, faceKey('puff', 'angry', this.blink.closed(dt)));
    // its shadow on the ground, so it is easy to tell where it hangs
    const high = Math.min(1, (GROUND - y) / 300);
    this.shadow
      .setPosition(x, GROUND + 3)
      .setScale(1 - high * 0.4)
      .setAlpha(0.7 - high * 0.4);
    this.flash.sync(e.flash);
  }
}

class PeaPodView implements EnemyView {
  private vine: GameObjects.Image;
  private pod: GameObjects.Image;
  private face: GameObjects.Image;
  private mark: GameObjects.Image;
  private flash: Flash;
  private blink = new Blink();

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.vine = part(scene, 'pea-vine').setDepth(depth);
    this.pod = part(scene, 'pea-pod').setDepth(depth);
    this.face = part(scene, faceKey('pod', 'angry')).setDepth(depth);
    this.mark = part(scene, 'warn-mark').setDepth(markDepth).setVisible(false);
    this.flash = new Flash([this.vine, this.pod, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.vine, this.pod, this.face]) img.setVisible(visible);
    if (!visible) this.mark.setVisible(false);
  }
  sync(e: Enemy, _alpha: number, dt: number) {
    const pod = e as PeaPod,
      warning = pod.warn > 0,
      gaping = pod.spitT >= 0 && pod.t - pod.spitT < 0.18,
      swell = warning ? (1 - pod.warn / PEA_WARN) * 0.2 + Math.sin(pod.t * 30) * 0.02 : 0,
      recoil = gaping ? 1 - (pod.t - pod.spitT) / 0.18 : 0,
      x = e.x,
      y = e.y;
    this.vine.setPosition(x + 6, y).setRotation(Math.sin(pod.t * 1.2) * 0.03);
    show(this.pod, gaping ? 'pea-pod-open' : 'pea-pod');
    this.pod
      .setPosition(x - 2 + recoil * 4, y - 28)
      .setScale(INV * (1 + swell) * (1 - recoil * 0.12), INV * (1 + swell) * (1 + recoil * 0.1));
    show(this.face, faceKey('pod', warning ? 'surprised' : 'angry', !warning && this.blink.closed(dt)));
    this.face.setPosition(x + 2 + recoil * 4, y - 31).setScale(INV * (1 + swell));
    if (warning) showMark(this.mark, x, y - 76, PEA_WARN - pod.warn);
    else this.mark.setVisible(false);
    this.flash.sync(e.flash);
  }
}

class SnapperView implements EnemyView {
  private mound: GameObjects.Image;
  private stem: GameObjects.Image;
  private head: GameObjects.Image;
  private face: GameObjects.Image;
  private clods: GameObjects.Image[];
  private mark: GameObjects.Image;
  private flash: Flash;

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.stem = part(scene, 'snap-stem').setDepth(depth - 0.02);
    this.head = part(scene, 'snap-head').setDepth(depth - 0.01);
    this.face = part(scene, faceKey('snap', 'angry')).setDepth(depth - 0.01);
    this.mound = part(scene, 'dirt-mound').setDepth(depth);
    this.clods = [0, 1, 2].map(() => part(scene, 'dirt-clod').setDepth(depth + 0.01));
    this.mark = part(scene, 'warn-mark').setDepth(markDepth).setVisible(false);
    this.flash = new Flash([this.stem, this.head, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.mound, this.stem, this.head, this.face, ...this.clods]) img.setVisible(visible);
    if (!visible) this.mark.setVisible(false);
  }
  sync(e: Enemy) {
    const s = e as Snapper,
      x = e.x,
      y = e.y,
      warning = s.state === 'warn',
      shaken = warning ? Math.sin(s.t * 60) * 2 : 0;
    // how far out of the mound it is: 0 = hidden, 1 = all the way up
    let out = 0;
    if (s.state === 'up') out = easeOutBack(Math.min(1, (SNAP_UP - s.timer) / 0.14));
    else if (s.state === 'down') out = 1 - Math.min(1, (SNAP_DOWN - s.timer) / 0.2);
    this.mound
      .setPosition(x + shaken, y + 3)
      .setScale(
        INV * 0.82,
        INV * 0.82 * (1 + (warning ? 0.06 + Math.sin(s.t * 24) * 0.04 : Math.sin(s.t * 2) * 0.02)),
      );
    const headY = y - 6 - out * 40,
      up = out > 0.05;
    this.head
      .setVisible(up)
      .setPosition(x + 2, headY)
      .setScale(INV * SNAP_HEAD);
    show(this.head, s.state === 'up' && Math.floor(s.t * 10) % 2 === 0 ? 'snap-head-open' : 'snap-head');
    this.face
      .setVisible(up)
      .setPosition(x - 12, headY - 11)
      .setScale(INV * SNAP_HEAD);
    this.stem
      .setVisible(up)
      .setPosition(x + 2, headY + 4)
      .setScale(INV, (INV * Math.max(0, y - headY - 6)) / 40);
    this.clods.forEach((clod, i) => {
      const hop = warning ? Math.abs(Math.sin(s.t * 14 + i * 2.1)) : 0;
      clod.setVisible(warning).setPosition(x - 18 + i * 18 + shaken, y - 6 - hop * 12);
    });
    if (warning) showMark(this.mark, x, y - 56, SNAP_WARN - s.timer);
    else this.mark.setVisible(false);
    this.flash.sync(e.flash);
  }
}

export class EnemyViews {
  private pool: ViewPool<Enemy, EnemyView>;

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.pool = new ViewPool(
      (e) => e.kind,
      (e): EnemyView => {
        switch (e.kind) {
          case 'grumbud':
            return new GrumbudView(scene, depth);
          case 'puffball':
            return new PuffballView(scene, depth);
          case 'peaPod':
            return new PeaPodView(scene, depth, markDepth);
          case 'snapper':
            return new SnapperView(scene, depth, markDepth);
        }
      },
    );
  }

  sync(enemies: readonly Enemy[], alpha: number, dt: number) {
    this.pool.sync(enemies, (e, view) => view.sync(e, alpha, dt));
  }
}
