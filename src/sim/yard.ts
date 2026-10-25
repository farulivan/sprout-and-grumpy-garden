// Pip's front yard: the little world behind the opening, the title and the main menu. Nothing fights here.
// Pip is the real Pip (player.ts), walked about by a script instead of the player: out of the cottage door in
// the opening, a hop or a stroll now and then while the title waits, and off down the garden path once Play
// is pressed. The beats, back to front:
//   sting (the studio's name) -> intro (the cold open) -> press ("Press any key") -> menu -> leave
// A press during the sting or the intro skips to the title with everything in its place.
import { STEP, W } from '../config';
import type { SimEvent } from './events';
import { NO_INPUT, type InputFrame } from './input';
import type { Level } from './level';
import { Player, type PlayerWorld } from './player';
import type { Projectile } from './projectile';

export type YardBeat = 'sting' | 'intro' | 'press' | 'menu' | 'leave';
// Seconds a script waits before going on, as a boss's attacks do (boss.ts).
type Script = Generator<number, void, undefined>;

// Where things stand in the yard, in world positions. The view puts the cottage's door at DOOR_X.
export const DOOR_X = 190;
export const HOME_X = 400; // where Pip waits on the title and the menu
// After Play, how long Pip runs before the game starts: the screen closes in on him as he goes.
export const LEAVE = 1.1;
// The beats that end by themselves, and the moments in the cold open that the view times itself to.
export const STING = 2.4;
export const INTRO = {
  sunrise: 0.5, // the sun peeks over the hills
  pullBack: 2, // the camera pulls back from the sky onto the yard
  door: 3.3, // the cottage door swings open
  hop: 3.55, // Pip hops out
  logo: 4.4, // the logo drops in
  end: 6, // "Press any key"
} as const;
// After a skip, presses are ignored this long, so a key mashed through the opening doesn't also press Start.
export const PRESS_GUARD = 0.35;
// How long Pip waits between the little things he does while the title waits.
const IDLE_GAPS = [7.5, 9, 8];
// Roughly how quickly Pip slows down once nothing pushes him (FRICTION in player.ts), to stop on his mark.
const BRAKE = 2800;

export interface YardOptions {
  beat?: 'sting' | 'menu'; // the game opening, or back to the menu from a level
}

export class Yard implements Level, PlayerWorld {
  readonly state = 'title';
  readonly minX = 24;
  readonly maxX = W + 120; // he may run off the right edge
  readonly platforms = [];
  readonly projectiles: Projectile[] = [];
  readonly player: Player;
  beat: YardBeat;
  t = 0; // seconds into the beat
  shown: boolean; // false while Pip is still indoors, before the door opens
  skipped = false; // the press beat was reached by skipping the opening
  private cheerT = 0;
  private goal: number | null = null; // walk here, then stop
  private jumpNext = false; // a jump press on the next step
  private jumpHold = 0; // seconds the jump stays held: a higher jump
  private script: Script | null = null;
  private wait = 0;
  private idle = 0; // which of the little idle acts comes next
  private idleT = IDLE_GAPS[0];
  private events: SimEvent[] = [];

  constructor(opts: YardOptions = {}) {
    this.player = new Player(this);
    this.beat = opts.beat ?? 'sting';
    this.shown = this.beat === 'menu';
    if (this.beat === 'menu') this.standAtHome();
    else this.player.x = this.player.px = DOOR_X;
  }

  // Pip celebrates: a happy bounce with the blaster held high (PlayerView).
  get cheering() {
    return this.cheerT > 0;
  }
  // Pip has set off down the garden path: time for the game to start.
  get done() {
    return this.beat === 'leave' && this.t >= LEAVE;
  }
  // A press now would count as pressing Start.
  get ready() {
    return this.beat === 'press' && !(this.skipped && this.t < PRESS_GUARD);
  }

  emit(e: SimEvent) {
    this.events.push(e);
  }
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // The yard ignores the player's input: Pip follows the script.
  step(_input: InputFrame = NO_INPUT) {
    const p = this.player,
      dt = STEP;
    p.px = p.x;
    p.py = p.y;
    this.t += dt;
    this.cheerT = Math.max(0, this.cheerT - dt);

    if (this.beat === 'sting' && this.t >= STING) this.setBeat('intro', this.intro());
    else if (this.beat === 'intro' && this.t >= INTRO.end) this.setBeat('press', null);
    this.runScript(dt);
    if ((this.beat === 'press' || this.beat === 'menu') && !this.script) {
      this.idleT -= dt;
      if (this.idleT <= 0) {
        this.script = this.idleAct(this.idle % 3);
        this.idleT = IDLE_GAPS[this.idle % IDLE_GAPS.length];
        this.idle++;
      }
    }
    p.update(dt, this.input());
    this.jumpNext = false;
    this.jumpHold = Math.max(0, this.jumpHold - dt);
  }

  // A press during the sting or the intro: straight to the title, with Pip on his mark.
  skip() {
    if (this.beat !== 'sting' && this.beat !== 'intro') return;
    this.setBeat('press', null);
    this.skipped = true;
    this.standAtHome();
  }

  // Start pressed on the title: Pip jumps for joy, and the menu comes.
  toMenu() {
    if (this.beat !== 'press') return;
    this.setBeat('menu', this.joyJump());
  }

  // Play: Pip runs off down the garden path.
  leave() {
    if (this.beat !== 'menu') return;
    this.setBeat('leave', null);
    this.cheerT = 0;
    this.hop();
    this.goal = this.maxX;
  }

  // The chosen button on the menu changed: Pip gives a little nod.
  nod() {
    if (this.player.onGround) this.player.sq = 0.88;
  }

  private setBeat(beat: YardBeat, script: Script | null) {
    this.beat = beat;
    this.t = 0;
    this.script = script;
    this.wait = 0;
    this.idleT = IDLE_GAPS[0];
  }

  private standAtHome() {
    const p = this.player;
    p.x = p.px = HOME_X;
    p.vx = p.vy = 0;
    p.facing = 1;
    this.shown = true;
    this.goal = null;
    this.jumpNext = false;
    this.jumpHold = 0;
  }

  private runScript(dt: number) {
    this.wait -= dt;
    while (this.script && this.wait <= 0) {
      const next = this.script.next();
      if (next.done) this.script = null;
      else this.wait += next.value;
    }
  }

  // What the script asks of Pip this step: walk toward the goal, letting go in time to stop on it.
  private input(): InputFrame {
    const p = this.player;
    let left = false,
      right = false;
    if (this.goal !== null) {
      const dx = this.goal - p.x,
        stopping = (p.vx * p.vx) / (2 * BRAKE) + 1;
      right = dx > stopping;
      left = dx < -stopping;
      if (!left && !right && Math.abs(p.vx) < 1 && p.onGround) this.goal = null;
    }
    return { ...NO_INPUT, left, right, jump: this.jumpHold > 0, jumpPressed: this.jumpNext };
  }

  private hop(hold = 0) {
    this.jumpNext = true;
    this.jumpHold = hold;
  }

  // The cold open: indoors until the door opens, then a hop out onto the path, a run to his mark and a
  // "ta-da" as the logo lands.
  private *intro(): Script {
    yield INTRO.hop;
    this.shown = true;
    this.hop();
    this.goal = HOME_X;
    yield 0.85;
    this.cheerT = 0.8;
  }

  private *joyJump(): Script {
    this.hop(0.12);
    yield 0.7;
    this.player.facing = 1;
  }

  // The little things Pip does while the title waits: a hop, a stroll and back, or a cheer.
  private *idleAct(which: number): Script {
    if (which === 0) {
      this.hop();
    } else if (which === 1) {
      this.goal = HOME_X - 56;
      yield 1.4;
      this.goal = HOME_X;
      yield 1.4;
    } else {
      this.cheerT = 0.7;
    }
  }
}
