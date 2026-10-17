// The game around the levels: which screen is showing, pause, mute, and the loop that advances the
// simulation at a fixed rate. A chapter can be a stage and then its boss: walking through the stage's gate
// starts the boss fight with the hearts Pip has left. It knows nothing about how the game is drawn; whatever
// draws it hands in a Presenter and calls tick() once per display frame.
import { GameAudio, type Tune } from './audio';
import { STEP } from './config';
import { Controls } from './controls';
import { present, type Presenter } from './presentation';
import { save } from './save';
import type { SimEvent } from './sim/events';
import { Fight } from './sim/fight';
import { Stage } from './sim/stage/stage';
import { Overlay } from './ui/overlay';

const MAX_FRAME = 0.05; // after a long hitch, slow down instead of catching up all at once
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

// What is being played: a boss fight (or the sleepy one behind the title card), or a stage.
export type Played = Fight | Stage;

export interface AppOptions {
  controls: Controls;
  audio: GameAudio;
  presenter: Presenter;
  stageFirst?: boolean; // Play! starts with the stage before the boss
  onLevel?: (level: Played) => void; // a new level replaced the old one
  onPause?: (paused: boolean) => void;
  onMute?: (muted: boolean) => void;
}

export class App {
  level: Played = new Fight({ seed: newSeed(), title: true }); // sleepy garden scene behind the title card
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
        retry: () => this.retry(),
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

  // Play! and Play again: the chapter from its first level.
  start() {
    if (this.o.stageFirst) this.startStage();
    else this.startBoss();
  }

  // Try again, and Start over on the pause card: the level being played, from its start. A boss fight
  // starts with full hearts this time, whatever Pip carried in.
  retry() {
    if (this.level instanceof Stage) this.startStage();
    else this.startBoss();
  }

  startStage() {
    this.begin(new Stage({ seed: newSeed(), easy: this.overlay.easy }), 'stage');
  }

  // hearts: what Pip carried in from the stage; without it he starts with all of them.
  startBoss(hearts?: number) {
    this.begin(new Fight({ seed: newSeed(), easy: this.overlay.easy, hearts }), 'boss');
  }

  private begin(level: Played, tune: Tune) {
    const { audio, controls } = this.o;
    audio.init();
    this.replaceLevel(level);
    this.overlay.show(null);
    audio.startMusic(tune);
    controls.endFrame(); // the key that started the game must not also make Pip jump
  }

  // Leave the level for the sleepy garden behind the title card, as when the game first opened.
  toTitle() {
    this.replaceLevel(new Fight({ seed: newSeed(), title: true }));
    this.overlay.show('title');
    this.o.audio.stopMusic();
  }

  private replaceLevel(level: Played) {
    this.level = level;
    this.acc = this.frozen = 0;
    this.o.onLevel?.(level);
    this.setPaused(false);
  }

  setPaused(paused: boolean) {
    if (paused && this.level.state !== 'play') return;
    if (paused !== this.paused) this.o.onPause?.(paused);
    this.paused = paused;
    this.o.audio.paused = paused;
    if (this.level.state === 'play') this.overlay.show(paused ? 'pause' : null);
  }

  toggleMute() {
    const { audio } = this.o;
    audio.muted = !audio.muted;
    save.muted = audio.muted;
    this.o.onMute?.(audio.muted);
    this.overlay.setMuted(audio.muted);
    if (this.level.state === 'play' && !this.paused)
      this.o.presenter.toast(audio.muted ? 'Sound off' : 'Sound on', 1.2);
  }

  // Call once per display frame with the real seconds since the last one.
  tick(dt: number) {
    const c = this.o.controls,
      state = this.level.state;
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
    } else if (state === 'win' && c.pressed('start')) {
      this.start();
    } else if (state === 'lose' && c.pressed('start')) {
      this.retry();
    } else {
      stepped = this.advance(dt);
    }
    c.endFrame(!stepped && !this.paused && this.level.state === 'play');
    this.overlay.setState(this.paused ? 'paused' : this.level.state);
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
      const level = this.level;
      level.step(this.o.controls.frame());
      this.o.controls.consumeJump();
      stepped = true;
      for (const e of level.drainEvents()) this.handle(e);
    }
    this.alpha = this.acc / STEP;
    return stepped;
  }

  private handle(e: SimEvent) {
    present(e, this.o.presenter, { touch: this.o.controls.touch });
    if (e.type === 'win' && this.level instanceof Fight) {
      const boss = this.level.boss.id,
        best = save.best(boss);
      this.overlay.showWin(e.result, best, save.recordWin(boss, e.result.time));
    } else if (e.type === 'stageExit') {
      this.startBoss(this.level.player.hp);
    } else if (e.type === 'lose') {
      this.overlay.showLose(e.progress, this.level instanceof Stage ? 'stage' : 'boss');
    }
  }
}
