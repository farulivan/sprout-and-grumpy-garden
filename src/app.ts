// The game around the fight: which screen is showing, pause, mute, and the loop that advances the
// simulation at a fixed rate. It knows nothing about how the game is drawn; whatever draws it hands in a
// Presenter and calls tick() once per display frame.
import { GameAudio } from './audio';
import { STEP } from './config';
import { Controls } from './controls';
import { present, type Presenter } from './presentation';
import { save } from './save';
import type { SimEvent } from './sim/events';
import { Fight } from './sim/fight';
import { Overlay } from './ui/overlay';

const MAX_FRAME = 0.05; // after a long hitch, slow down instead of catching up all at once
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

export interface AppOptions {
  controls: Controls;
  audio: GameAudio;
  presenter: Presenter;
  onFight?: (fight: Fight) => void; // a new fight replaced the old one
  onPause?: (paused: boolean) => void;
  onMute?: (muted: boolean) => void;
}

export class App {
  fight: Fight = new Fight({ seed: newSeed(), title: true }); // sleepy garden scene behind the title card
  paused = false;
  // How far the display is between the previous simulation step (0) and the current one (1).
  alpha = 1;
  private acc = 0;
  private frozen = 0; // seconds of hit-stop left
  private overlay: Overlay;

  constructor(private o: AppOptions) {
    this.overlay = new Overlay(
      {
        start: () => this.start(),
        resume: () => this.setPaused(false),
        pause: () => this.setPaused(true),
        title: () => this.toTitle(),
        mute: () => {
          o.audio.init();
          this.toggleMute();
        },
        easy: (on) => (save.easy = on),
      },
      save.easy,
    );
    if (save.muted) {
      o.audio.muted = true;
      this.overlay.setMuted(true);
    }
    this.overlay.show('title');
  }

  start() {
    const { audio, controls } = this.o;
    audio.init();
    this.replaceFight(new Fight({ seed: newSeed(), easy: this.overlay.easy }));
    this.overlay.show(null);
    audio.startMusic();
    controls.endFrame(); // the key that started the game must not also make Pip jump
  }

  // Leave the fight for the sleepy garden behind the title card, as when the game first opened.
  toTitle() {
    this.replaceFight(new Fight({ seed: newSeed(), title: true }));
    this.overlay.show('title');
    this.o.audio.stopMusic();
  }

  private replaceFight(fight: Fight) {
    this.fight = fight;
    this.acc = this.frozen = 0;
    this.o.onFight?.(fight);
    this.setPaused(false);
  }

  setPaused(paused: boolean) {
    if (paused && this.fight.state !== 'play') return;
    if (paused !== this.paused) this.o.onPause?.(paused);
    this.paused = paused;
    this.o.audio.paused = paused;
    if (this.fight.state === 'play') this.overlay.show(paused ? 'pause' : null);
  }

  toggleMute() {
    const { audio } = this.o;
    audio.muted = !audio.muted;
    save.muted = audio.muted;
    this.o.onMute?.(audio.muted);
    this.overlay.setMuted(audio.muted);
    if (this.fight.state === 'play' && !this.paused)
      this.o.presenter.toast(audio.muted ? 'Sound off' : 'Sound on', 1.2);
  }

  // Call once per display frame with the real seconds since the last one.
  tick(dt: number) {
    const c = this.o.controls,
      state = this.fight.state;
    c.poll();
    if (c.pressed('mute')) this.toggleMute();
    let stepped = false;
    if (this.paused) {
      // The pause card's buttons: move between them with the arrow keys or the d-pad, and press one with
      // Space, Enter or A. With none chosen, that is "Keep playing".
      if (c.pressed('pause')) this.setPaused(false);
      else if (c.pressed('start') || c.pressed('jump')) this.overlay.press();
      else if (c.pressed('left')) this.overlay.choose(-1, 0);
      else if (c.pressed('right')) this.overlay.choose(1, 0);
      else if (c.pressed('up')) this.overlay.choose(0, -1);
      else if (c.pressed('down')) this.overlay.choose(0, 1);
      c.consumeJump(); // a press that worked the card must not also make Pip jump
    } else if (state === 'play' && c.pressed('pause')) {
      this.setPaused(true);
      this.overlay.choose(); // paused from the keyboard or a gamepad: start on "Keep playing"
    } else if (state === 'title' && (c.pressed('start') || c.pressed('jump') || c.pressed('shoot'))) {
      this.start();
    } else if ((state === 'win' || state === 'lose') && c.pressed('start')) {
      this.start();
    } else {
      stepped = this.advance(dt);
    }
    c.endFrame(!stepped && !this.paused && this.fight.state === 'play');
    this.overlay.setState(this.paused ? 'paused' : this.fight.state);
  }

  // Hold the fight still for a moment, so a big hit is felt. The picture keeps moving; only the
  // simulation waits.
  hitStop(seconds: number) {
    this.frozen = Math.max(this.frozen, seconds);
  }

  // Run as many fixed steps as the elapsed time covers. Returns whether any ran.
  private advance(dt: number) {
    if (this.frozen > 0) {
      this.frozen -= dt;
      return false;
    }
    this.acc += Math.min(dt, MAX_FRAME);
    let stepped = false;
    while (this.acc >= STEP && this.frozen <= 0) {
      this.acc -= STEP;
      const fight = this.fight;
      fight.step(this.o.controls.frame());
      this.o.controls.consumeJump();
      stepped = true;
      for (const e of fight.drainEvents()) this.handle(e);
    }
    this.alpha = this.acc / STEP;
    return stepped;
  }

  private handle(e: SimEvent) {
    present(e, this.o.presenter, { touch: this.o.controls.touch });
    if (e.type === 'win') {
      const boss = this.fight.boss.id,
        best = save.best(boss);
      this.overlay.showWin(e.result, best, save.recordWin(boss, e.result.time));
    } else if (e.type === 'lose') {
      this.overlay.showLose(e.progress);
    }
  }
}
