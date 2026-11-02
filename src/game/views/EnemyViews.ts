// The small enemies on a stage, each acting out what the simulation says it is doing: a Grumbud waddles on
// its root feet, a Puffball bobs and fluffs, a Pea Pod swells under its "!" and gapes as it spits, a Snapper
// rumbles in its mound, snaps up chomping and ducks back down. Every hit flashes white. Their parts are baked
// in enemies/art.ts; the "!" is the same badge the boss's hazards use. The Mushroom Wood's four (a Capling, a
// Burr, a Dropcap and a Toadlet) and the bounce pad have theirs in wood/enemyArt.ts.
import { TintModes, type GameObjects, type Scene } from 'phaser';
import { GROUND } from '../../config';
import { lerp } from '../../sim/math';
import type { Bouncer } from '../../sim/bouncer';
import { BURR_WARN, type Burr } from '../../sim/stage/enemies/burr';
import { DROP_WARN, type Dropcap } from '../../sim/stage/enemies/dropcap';
import type { Enemy } from '../../sim/stage/enemies/enemy';
import { PEA_WARN, type PeaPod } from '../../sim/stage/enemies/peaPod';
import { SNAP_DOWN, SNAP_UP, SNAP_WARN, type Snapper } from '../../sim/stage/enemies/snapper';
import type { Toadlet } from '../../sim/stage/enemies/toadlet';
import { INV, part, show } from '../art/bake';
import { easeOutBack } from '../motion';
import { faceKey } from './faces';
import { showMark } from './HazardViews';
import { ViewPool, type PooledView } from './pool';

export { bakeEnemies } from './enemies/art';

const NOBODY: readonly Enemy[] = [];
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

// ---- the Mushroom Wood's ----

class CaplingView implements EnemyView {
  private shadow: GameObjects.Image;
  private body: GameObjects.Image;
  private face: GameObjects.Image;
  private flash: Flash;
  private blink = new Blink();
  private squash = 0;
  private lastFlash = 0;

  constructor(scene: Scene, depth: number) {
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.body = part(scene, 'capling-body').setDepth(depth);
    this.face = part(scene, faceKey('capling', 'angry')).setDepth(depth);
    this.flash = new Flash([this.body, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.shadow, this.body, this.face]) img.setVisible(visible);
  }
  sync(e: Enemy, _alpha: number, dt: number) {
    if (e.flash > this.lastFlash) this.squash = 1;
    this.lastFlash = e.flash;
    this.squash = Math.max(0, this.squash - dt * 6);
    // it sulks: a slow breath, and a flinch at each seed
    const breathe = Math.sin(e.t * 2.1) * 0.035,
      wide = 1 + breathe + this.squash * 0.16,
      tall = 1 - breathe - this.squash * 0.14;
    this.shadow.setPosition(e.x, e.y + 2).setScale(0.95, 0.8);
    this.body.setPosition(e.x, e.y).setScale(INV * wide, INV * tall);
    show(this.face, faceKey('capling', 'angry', this.blink.closed(dt)));
    this.face.setPosition(e.x, e.y - 14 * tall);
    this.flash.sync(e.flash);
  }
}

class BurrView implements EnemyView {
  private shadow: GameObjects.Image;
  private body: GameObjects.Image;
  private face: GameObjects.Image;
  private stars: GameObjects.Image[];
  private mark: GameObjects.Image;
  private flash: Flash;
  private spin = 0;

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.body = part(scene, 'burr-body').setDepth(depth);
    this.face = part(scene, faceKey('burr', 'angry')).setDepth(depth);
    this.stars = [0, 1, 2].map(() => part(scene, 'burr-star').setDepth(depth + 0.01));
    this.mark = part(scene, 'warn-mark').setDepth(markDepth).setVisible(false);
    this.flash = new Flash([this.body, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.shadow, this.body, this.face]) img.setVisible(visible);
    if (!visible) {
      this.mark.setVisible(false);
      for (const s of this.stars) s.setVisible(false);
    }
  }
  sync(e: Enemy, alpha: number, dt: number) {
    const b = e as Burr,
      x = lerp(e.px, e.x, alpha),
      warning = b.state === 'warn',
      rolling = b.state === 'roll',
      dizzy = b.state === 'dizzy';
    // it winds up under the "!", then spins as it rolls; it can only be hurt once it has come to rest
    if (rolling) this.spin += (dt * 380 * b.facing) / 22;
    else if (warning) this.spin -= dt * 16 * b.facing * (1 - b.timer / BURR_WARN);
    else this.spin *= 1 - Math.min(1, dt * 8);
    const size = dizzy ? 1.06 : warning ? 0.82 + 0.05 * Math.sin(e.t * 40) : rolling ? 0.9 : 1,
      lean = dizzy ? Math.sin(e.t * 7) * 0.22 : this.spin;
    this.shadow.setPosition(x, e.y + 2).setScale(0.9, 0.8);
    this.body
      .setPosition(x, e.y - 20)
      .setRotation(lean)
      .setScale(INV * size);
    // while it is curled up tight there is no face to see
    this.face.setVisible(!rolling && !warning).setPosition(x + (dizzy ? Math.sin(e.t * 7) * 3 : 0), e.y - 19);
    show(this.face, faceKey('burr', dizzy ? 'worried' : 'angry'));
    this.stars.forEach((s, i) => {
      const a = e.t * 5 + (i * Math.PI * 2) / 3;
      s.setVisible(dizzy)
        .setPosition(x + Math.cos(a) * 24, e.y - 50 + Math.sin(a) * 6)
        .setAlpha(dizzy ? Math.min(1, b.timer / 0.3) : 0);
    });
    if (warning) showMark(this.mark, x, e.y - 60, BURR_WARN - b.timer);
    else this.mark.setVisible(false);
    this.flash.sync(e.flash);
  }
}

class DropcapView implements EnemyView {
  private shadow: GameObjects.Image;
  private thread: GameObjects.Image;
  private body: GameObjects.Image;
  private face: GameObjects.Image;
  private mark: GameObjects.Image;
  private flash: Flash;
  private fell = 0; // the squash as it lands

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.thread = part(scene, 'dropcap-thread').setDepth(depth - 0.01);
    this.body = part(scene, 'dropcap-body').setDepth(depth);
    this.face = part(scene, faceKey('dropcap', 'angry')).setDepth(depth);
    this.mark = part(scene, 'warn-mark').setDepth(markDepth).setVisible(false);
    this.flash = new Flash([this.body, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.shadow, this.thread, this.body, this.face]) img.setVisible(visible);
    if (!visible) this.mark.setVisible(false);
  }
  sync(e: Enemy, alpha: number, dt: number) {
    const d = e as Dropcap,
      y = lerp(e.py, e.y, alpha),
      warning = d.state === 'warn',
      high = d.state === 'hang' || warning,
      down = d.state === 'down',
      shaken = warning ? Math.sin(e.t * 50) * 2 : 0,
      sway = high ? Math.sin(e.t * 1.5) * 0.09 : 0;
    this.fell = down ? Math.min(1, this.fell + dt * 7) : 0;
    const splat = down ? Math.sin(this.fell * Math.PI) * 0.3 : 0,
      stretch = d.state === 'fall' ? 0.14 : 0;
    this.thread.setVisible(high).setPosition(e.x, y - 8);
    this.body
      .setPosition(e.x + shaken, y)
      .setRotation(sway)
      .setScale(INV * (1 + splat - stretch), INV * (1 - splat + stretch));
    show(this.face, faceKey('dropcap', warning || d.state === 'fall' ? 'surprised' : 'angry'));
    this.face.setPosition(e.x + shaken, y + 5);
    // its shadow on the ground under it, so it's easy to see where it will land
    const lift = Math.min(1, (GROUND - y) / 320);
    this.shadow
      .setPosition(e.x, GROUND + 3)
      .setScale(0.9 - lift * 0.4, 0.8 - lift * 0.3)
      .setAlpha(0.8 - lift * 0.35);
    if (warning) showMark(this.mark, e.x, y - 38, DROP_WARN - d.timer);
    else this.mark.setVisible(false);
    this.flash.sync(e.flash);
  }
}

class ToadletView implements EnemyView {
  private shadow: GameObjects.Image;
  private body: GameObjects.Image;
  private face: GameObjects.Image;
  private spot: GameObjects.Image;
  private flash: Flash;
  private blink = new Blink();
  private landed = 1; // 1 -> 0 after it comes down

  constructor(scene: Scene, depth: number) {
    this.spot = part(scene, 'toadlet-spot').setDepth(depth - 0.2);
    this.shadow = part(scene, 'dew-shadow').setDepth(depth - 0.1);
    this.body = part(scene, 'toadlet-body').setDepth(depth);
    this.face = part(scene, faceKey('toadlet', 'angry')).setDepth(depth);
    this.flash = new Flash([this.body, this.face]);
  }
  setVisible(visible: boolean) {
    for (const img of [this.shadow, this.body, this.face]) img.setVisible(visible);
    if (!visible) this.spot.setVisible(false);
  }
  sync(e: Enemy, alpha: number, dt: number) {
    const a = e as Toadlet,
      x = lerp(e.px, e.x, alpha),
      y = lerp(e.py, e.y, alpha),
      hop = a.state === 'hop';
    this.landed = hop ? 1 : Math.max(0, this.landed - dt * 6);
    // stretched in the air, squashed where it lands, crouching lower as the next hop comes
    const crouch = hop ? 0 : 0.2 * (1 - Math.min(1, a.timer / 0.3)) + Math.sin(this.landed * Math.PI) * 0.16,
      wide = hop ? 0.9 : 1 + crouch,
      tall = hop ? 1.14 : 1 - crouch;
    this.body.setPosition(x, y).setScale(INV * wide * e.facing * -1, INV * tall);
    show(this.face, faceKey('toadlet', hop ? 'surprised' : 'angry', !hop && this.blink.closed(dt)));
    this.face.setPosition(x, y - 13 * tall);
    const lift = Math.min(1, (GROUND - y) / 110);
    this.shadow
      .setPosition(x, GROUND + 3)
      .setScale(0.85 - lift * 0.3, 0.75 - lift * 0.25)
      .setAlpha(0.8 - lift * 0.3);
    // an orange ring on the ground where it will come down, as for anything that lands
    this.spot
      .setVisible(hop)
      .setPosition(a.landX, GROUND + 1)
      .setAlpha(0.65 + Math.sin(e.t * 18) * 0.25);
    this.flash.sync(e.flash);
  }
}

// A cheered-up Capling: a bounce pad that squashes as Pip lands on it and springs back.
class BouncerView implements PooledView {
  private body: GameObjects.Image;

  constructor(scene: Scene, depth: number) {
    this.body = part(scene, 'capling-happy').setDepth(depth);
  }
  setVisible(visible: boolean) {
    this.body.setVisible(visible);
  }
  sync(b: Bouncer) {
    // it pops up as it cheers up, and each time Pip lands it squashes flat and springs back past its size
    const u = 1 - b.sprung,
      spring = b.sprung > 0 ? Math.sin(u * Math.PI * 2.5) * (1 - u) * 0.42 : 0,
      grow = easeOutBack(Math.min(1, b.t / 0.28)),
      idle = Math.sin(b.t * 2.4) * 0.02;
    this.body
      .setPosition(b.x, b.y)
      .setScale(INV * grow * (1 + spring * 0.6 - idle), INV * grow * (1 - spring + idle));
  }
}

export class BouncerViews {
  private pool: ViewPool<Bouncer, BouncerView>;

  constructor(scene: Scene, depth: number) {
    this.pool = new ViewPool(
      () => 'bouncer',
      () => new BouncerView(scene, depth),
    );
  }

  sync(bouncers: readonly Bouncer[]) {
    this.pool.sync(bouncers, (b, view) => view.sync(b));
  }
}

export class EnemyViews {
  private pool: ViewPool<Enemy, EnemyView>;
  // a later wave's plants aren't there yet: an orange "!" stands where each one will come up
  private arrivals: ViewPool<Enemy, GameObjects.Image>;

  constructor(scene: Scene, depth: number, markDepth: number) {
    this.arrivals = new ViewPool(
      () => 'arrival',
      () => part(scene, 'warn-mark').setDepth(markDepth),
    );
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
          case 'capling':
            return new CaplingView(scene, depth);
          case 'burr':
            return new BurrView(scene, depth, markDepth);
          case 'dropcap':
            return new DropcapView(scene, depth, markDepth);
          case 'toadlet':
            return new ToadletView(scene, depth);
        }
      },
    );
  }

  sync(enemies: readonly Enemy[], alpha: number, dt: number) {
    const arriving = enemies.some((e) => e.entering > 0);
    this.pool.sync(arriving ? enemies.filter((e) => e.entering <= 0) : enemies, (e, view) =>
      view.sync(e, alpha, dt),
    );
    this.arrivals.sync(arriving ? enemies.filter((e) => e.entering > 0) : NOBODY, (e, mark) =>
      showMark(mark, e.x, Math.min(e.y, GROUND - 40), 1 - e.entering),
    );
  }
}
