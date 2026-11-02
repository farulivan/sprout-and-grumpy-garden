// Mo the Moody Mushroom. Sunny stands still; Mo hops all over the arena, so the fight has no fixed spot.
// Between attacks he sulks: his cap sits down over his face, seeds on the cap bounce off, and only his stalk can be
// hurt. When he rears up to attack, his face is open for double damage, so the most damage comes when it is most
// dangerous. It can be hit by aiming up from the ground, or by a straight shot during any jump or bounce, so a
// touch screen plays the same fight. Touching him hurts, but while he sulks his cap is bouncy: landing on it
// throws Pip over him, so he can never pin Pip against a wall.
// How he moves is kept in plain fields, stepped by move(); the attacks below only decide when.
import { GROUND, W } from '../../config';
import { Boss, type Attack } from '../boss';
import type { Springy } from '../bouncer';
import type { Fight } from '../fight';
import { AcidSmoke, FairyRing, RING_ERUPT, RING_SEEK, RING_WARN } from '../hazards';
import { circleHit, clamp, rectCircleHit, type Circle, type Rect } from '../math';
import { Capling } from '../stage/enemies/capling';
import { SporeBubble } from '../stage/enemies/spore';

const ATTACKS = ['bigHop', 'fairyRing', 'sporePuffs', 'sproutCaplings', 'capSpin'] as const;
type MoAttack = (typeof ATTACKS)[number];

const POOLS: Record<number, readonly MoAttack[]> = {
  1: ['bigHop', 'fairyRing'],
  2: ['bigHop', 'fairyRing', 'sporePuffs', 'sproutCaplings'],
  3: ['bigHop', 'fairyRing', 'sporePuffs', 'sproutCaplings', 'capSpin'],
};

// The arena: the full width, and two low shelf fungi at the sides, all within the Fairy Ring's reach.
export const MO_PLATFORMS: readonly Rect[] = [
  { x: 36, y: 388, w: 110, h: 22 },
  { x: W - 146, y: 388, w: 110, h: 22 },
];
const MAX_X = W - 24;
// How far along the floor he goes: never so near a wall that a Pip beside it would be touching him.
export const MO_LEFT = 150,
  MO_RIGHT = W - 150;
const START_X = 690;

// His shape, from his feet. rear goes from 0 (sulking, cap down) to 1 (reared up, face open).
export const MID = 70, // his y is this far above his feet: the middle of him, for effects
  CAP_RX = 82, // half the cap's width...
  CAP_RY = 36, // ...and half its height
  CAP_LOW = 92, // how high the cap's middle is, sulking...
  CAP_HIGH = 178, // ...and reared up
  STALK_HALF = 36,
  FACE_LOW = 64, // how high his face is, sulking...
  FACE_HIGH = 122, // ...and reared up
  FACE_R = 32,
  SPIN_R = 52; // spinning, he is one low round whirl
const HOP_T = 0.8, // seconds in the air
  HOP_V = 850, // about 170 px up (V * T / 4): plenty of room to run under him
  HOP_G = (2 * HOP_V) / HOP_T,
  HOP_NEAR = 130, // he comes down at least this far from where Pip is as he sets off...
  HOP_FAR = 220, // ...and no farther than this
  REAR_RATE = 9;
const SMOKE_SPEED = 365,
  SPIN_SPEED = 430,
  SPIN_WALL = 60, // how near a wall he spins to: no hiding beside one
  DIZZY = 2.6, // seconds he sits dizzy after a Cap Spin, face open
  SMOKE_AT = 62, // how far from his middle each smoke front starts
  SPORE_FROM = 40; // how far above his cap the spores come from

// An oval hit by a circle.
function ovalHit(cx: number, cy: number, rx: number, ry: number, c: Circle) {
  const dx = (c.x - cx) / (rx + c.r),
    dy = (c.y - cy) / (ry + c.r);
  return dx * dx + dy * dy < 1;
}

// His cap while he sulks: falling onto it bounces Pip.
class CapSpring implements Springy {
  sprung = 0;
  dead = false;
  constructor(private mo: Mo) {}
  get x() {
    return this.mo.x;
  }
  get top() {
    return this.mo.capTop;
  }
  catches(x: number, prevY: number, y: number) {
    return this.mo.capBouncy && Math.abs(x - this.x) < CAP_RX && prevY <= this.top + 0.01 && y >= this.top;
  }
}

export class Mo extends Boss {
  readonly id = 'mo' as const;
  readonly name = 'Mo the Moody Mushroom';
  readonly platforms = MO_PLATFORMS;
  readonly maxX = MAX_X;
  feet = GROUND;
  rear = 0; // 0 = sulking, 1 = reared up
  open = false; // he is rearing up to attack: his face can be hit
  airborne = false;
  landX: number | null = null; // where a Big Hop will come down, for its ring
  spinning = false;
  dizzy = 0; // seconds he has left to sit dizzy
  readonly spring: CapSpring;
  protected readonly idleTime = [1.2, 0.95, 0.75];
  protected readonly speedMuls = [1, 1.1, 1.2];
  private vx = 0;
  private vy = 0;
  private spinTo = 0;
  private spinSpeed = 0;

  constructor(fight: Fight) {
    super(fight, 380);
    this.x = this.px = START_X;
    this.y = this.py = GROUND - MID;
    this.spring = new CapSpring(this);
    fight.bouncers.push(this.spring);
  }

  // ---- his shape now ----
  get capY() {
    return this.feet - (CAP_LOW + (CAP_HIGH - CAP_LOW) * this.rear);
  }
  get capTop() {
    return this.capY - CAP_RY;
  }
  get faceY() {
    return this.feet - (FACE_LOW + (FACE_HIGH - FACE_LOW) * this.rear);
  }
  // He has reared far enough for his face to show, and isn't whirling.
  get faceOpen() {
    return this.open && this.rear > 0.5 && !this.spinning;
  }
  get capBouncy() {
    return this.alive && !this.open && !this.airborne && !this.spinning;
  }
  private get stalk(): Rect {
    const top = this.faceOpen ? this.faceY + FACE_R - 4 : this.capY;
    return { x: this.x - STALK_HALF, y: top, w: STALK_HALF * 2, h: Math.max(0, this.feet - top) };
  }
  private get whirl(): Circle {
    return { x: this.x, y: this.feet - SPIN_R + 10, r: SPIN_R };
  }
  private get face(): Circle {
    return { x: this.x, y: this.faceY, r: FACE_R };
  }

  hitTest(c: Circle) {
    if (this.spinning) return 0;
    if (this.faceOpen && circleHit(c, this.face)) return 2;
    return rectCircleHit(this.stalk, c) ? 1 : 0;
  }
  override blocks(c: Circle) {
    return this.spinning ? circleHit(c, this.whirl) : ovalHit(this.x, this.capY, CAP_RX, CAP_RY, c);
  }
  override touches(c: Circle) {
    if (this.spinning) return circleHit(c, this.whirl);
    return (
      rectCircleHit(this.stalk, c) ||
      ovalHit(this.x, this.capY, CAP_RX, CAP_RY, c) ||
      (this.faceOpen && circleHit(c, this.face))
    );
  }
  hurtboxes() {
    return {
      weak: this.faceOpen ? [this.face] : [],
      body: this.spinning ? [] : [this.stalk],
      shield: this.spinning ? [this.whirl] : [{ x: this.x, y: this.capY, r: CAP_RY }],
    };
  }

  protected move(dt: number) {
    this.rear += ((this.open ? 1 : 0) - this.rear) * Math.min(1, dt * REAR_RATE);
    this.dizzy = Math.max(0, this.dizzy - dt);
    this.spring.sprung = Math.max(0, this.spring.sprung - dt * 3);
    if (this.airborne) {
      this.x = clamp(this.x + this.vx * dt, MO_LEFT, MO_RIGHT);
      this.vy += HOP_G * dt;
      this.feet += this.vy * dt;
      if (this.feet >= GROUND) this.land();
    } else if (this.spinning) {
      const step = this.spinSpeed * dt,
        d = this.spinTo - this.x;
      if (Math.abs(d) <= step) this.x = this.spinTo;
      else this.x += Math.sign(d) * step;
    }
    this.y = this.feet - MID;
  }

  private land() {
    const f = this.fight;
    this.feet = GROUND;
    this.vx = this.vy = 0;
    this.airborne = false;
    this.landX = null;
    if (!this.alive || this.state !== 'fight') return;
    f.emit({ type: 'thud', x: this.x, y: GROUND });
    const speed = SMOKE_SPEED * this.speedMul;
    for (const dir of [-1, 1] as const)
      f.hazards.push(new AcidSmoke(this.x + dir * SMOKE_AT, dir, speed, f.minX - 40, f.maxX + 40));
  }

  // He stops whatever he is doing: a new phase, the end of the fight.
  private calm() {
    this.open = false;
    this.spinning = false;
    this.dizzy = 0;
    this.landX = null;
    this.x = clamp(this.x, MO_LEFT, MO_RIGHT);
  }
  protected override startPhase() {
    this.calm();
    super.startPhase();
  }
  protected override defeat() {
    this.calm();
    super.defeat();
  }
  override halt() {
    this.calm();
    super.halt();
  }
  protected override endAttack() {
    this.open = false;
    super.endAttack();
  }

  protected chooseAttack(): Attack {
    const pool = POOLS[this.phase];
    let name: MoAttack;
    do name = this.fight.rng.pick(pool);
    while (name === this.lastAttack && pool.length > 1);
    this.lastAttack = this.attackName = name;
    return this[name]();
  }
  attack(name: string): Attack {
    if (!(ATTACKS as readonly string[]).includes(name)) throw new Error(`Mo has no attack "${name}"`);
    return this[name as MoAttack]();
  }

  // Rears up under the "!".
  private rearUp(t: number) {
    this.open = true;
    this.warn(t);
  }

  // Where a hop comes down: near Pip but never on him, and past him if there's room, so that he goes over Pip's
  // head; otherwise on this side of him.
  private landingSpot() {
    const p = this.fight.player,
      off = this.fight.rng.range(HOP_NEAR, HOP_FAR),
      past = p.x > this.x ? 1 : -1,
      beyond = p.x + past * off;
    if (beyond >= MO_LEFT && beyond <= MO_RIGHT) return beyond;
    const before = p.x - past * off;
    if (before >= MO_LEFT && before <= MO_RIGHT) return before;
    // Pip is by a wall and everything near is off the floor: as near as he can come
    return clamp(p.x + (p.x < W / 2 ? HOP_NEAR : -HOP_NEAR), MO_LEFT, MO_RIGHT);
  }

  // ---------------- attacks ----------------

  // A hop or more, each coming down on a ringed spot near Pip with acid smoke rolling out each way.
  *bigHop(): Attack {
    for (let i = 0; i < this.phase; i++) {
      const to = this.landingSpot(),
        wait = i === 0 ? 0.6 : 0.4;
      this.landX = to;
      this.rearUp(wait);
      yield wait;
      this.vx = (to - this.x) / HOP_T;
      this.vy = -HOP_V;
      this.airborne = true;
      yield HOP_T + 0.3;
    }
    yield 0.35;
    this.endAttack();
  }

  // A root creeps through the soil after Pip, stops, and a ring of toadstools erupts straight up, even through a
  // shelf. He sulks while it does.
  *fairyRing(): Attack {
    this.rearUp(0.5);
    yield 0.5;
    const p = this.fight.player,
      n = this.phase === 3 ? 2 : 1;
    // it starts off to one side of Pip, wherever he is, so nowhere is out of its reach
    for (let i = 0; i < n; i++) {
      const side = this.fight.rng.next() < 0.5 ? -1 : 1;
      this.fight.hazards.push(
        new FairyRing(p, p.x + side * this.fight.rng.range(90, 170), i === 0 ? 170 : 110, i * 0.5),
      );
    }
    this.puff = 0.8;
    yield 0.7;
    this.open = false;
    yield (RING_SEEK + RING_WARN + RING_ERUPT) * 0.45;
    this.endAttack();
  }

  // Slow bubbles drift at Pip, one after another: dodge them, or spend shots popping them.
  *sporePuffs(): Attack {
    this.rearUp(0.55);
    yield 0.55;
    const n = this.phase + 1;
    for (let i = 0; i < n; i++) {
      this.fight.addEnemy(new SporeBubble(this.x, this.capTop - SPORE_FROM, 62 * this.speedMul));
      this.puff = 0.7;
      this.fight.emit({ type: 'spit' });
      yield 0.42;
    }
    yield 0.5;
    this.endAttack();
  }

  // Caplings come up at spots away from Pip, under a "!". A bounce pad gives height, time in the air and a way
  // over him; cheered up they stay about 8 s, and left alone they wilt soon after.
  *sproutCaplings(): Attack {
    this.rearUp(0.6);
    yield 0.6;
    const f = this.fight,
      n = this.phase;
    for (let i = 0; i < n; i++) {
      let x = 0;
      for (let tries = 0; tries < 8; tries++) {
        x = f.rng.range(90, W - 90);
        if (Math.abs(x - f.player.x) > 110 && Math.abs(x - this.x) > CAP_RX + 40) break;
      }
      const capling = new Capling(x, GROUND, 11);
      capling.entering = 0.8;
      f.addEnemy(capling);
    }
    yield 1.1;
    this.endAttack();
  }

  // He whirls to the wall on Pip's side, then all the way to the other, and sits dizzy there with his face open.
  *capSpin(): Attack {
    this.rearUp(0.8);
    yield 0.8;
    const f = this.fight,
      first = f.player.x < this.x ? SPIN_WALL : W - SPIN_WALL,
      second = first === SPIN_WALL ? W - SPIN_WALL : SPIN_WALL;
    this.open = false;
    this.spinning = true;
    this.spinSpeed = SPIN_SPEED * this.speedMul;
    for (const to of [first, second]) {
      this.spinTo = to;
      yield Math.abs(to - this.x) / this.spinSpeed + 0.12;
    }
    this.spinning = false;
    this.x = clamp(this.x, MO_LEFT, MO_RIGHT);
    f.emit({ type: 'thud', x: this.x, y: GROUND });
    this.open = true;
    this.dizzy = DIZZY;
    yield DIZZY;
    this.endAttack();
  }
}
