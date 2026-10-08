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
  private overlay: Overlay;

  constructor(private o: AppOptions) {
    this.overlay = new Overlay(
      {
        start: () => this.start(),
        resume: () => this.setPaused(false),
        pause: () => this.setPaused(true),
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
    this.fight = new Fight({ seed: newSeed(), easy: this.overlay.easy });
    this.acc = 0;
    this.o.onFight?.(this.fight);
    this.setPaused(false);
    this.overlay.show(null);
    audio.startMusic();
    controls.endFrame(); // the key that started the game must not also make Pip jump
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
      if (c.pressed('pause') || c.pressed('start')) this.setPaused(false);
    } else if (state === 'play' && c.pressed('pause')) {
      this.setPaused(true);
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

  // Run as many fixed steps as the elapsed time covers. Returns whether any ran.
  private advance(dt: number) {
    this.acc += Math.min(dt, MAX_FRAME);
    let stepped = false;
    while (this.acc >= STEP) {
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
