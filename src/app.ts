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
import { Overlay, type StagePath } from './ui/overlay';

const MAX_FRAME = 0.05; // after a long hitch, slow down instead of catching up all at once
const newSeed = () => Math.floor(Math.random() * 2 ** 32);
// The chapter: a stage, then its boss through the stage's gate.
const CHAPTER = { stage: 'gardenPath', boss: 'sunny' } as const;
// Pip's lives in a game, as in Super Mario Bros.: losing a level, or giving it up with Start over, costs one,
// and with none left the game starts again from its first level.
export const LIVES = 3;

// What is being played: a boss fight (or the sleepy one behind the title card), or a stage.
export type Played = Fight | Stage;

export interface AppOptions {
  controls: Controls;
  audio: GameAudio;
  presenter: Presenter;
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
  lives = LIVES; // left in this game, counting the one being played
  private overlay: Overlay;
  private path: StagePath | null = null; // how this run's stage went, for the win card

  constructor(private o: AppOptions) {
    this.overlay = new Overlay(
      {
        start: () => this.start(),
        retry: () => this.retry(),
        restart: () => this.startOver(),
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

  // Play! and Play again, and Start again once the lives are gone: a new game from its first level, with
  // all of Pip's lives.
  start() {
    this.lives = LIVES;
    this.startStage();
  }

  // Try again on the lose card: the level that was lost, from its start. A boss fight starts with full
  // hearts this time, whatever Pip carried in. With no lives left, a new game instead.
  retry() {
    if (this.lives <= 0) this.start();
    else if (this.level instanceof Stage) this.startStage();
    else this.startBoss();
  }

  // Start over on the pause card gives up this life: the level again, or a new game if it was the last.
  startOver() {
    this.lives--;
    this.retry();
  }

  startStage() {
    this.path = null;
    this.begin(new Stage({ seed: newSeed(), stage: CHAPTER.stage, easy: this.overlay.easy }), 'stage');
  }

  // hearts: what Pip carried in from the stage; without it he starts with all of them.
  startBoss(hearts?: number) {
    this.begin(new Fight({ seed: newSeed(), boss: CHAPTER.boss, easy: this.overlay.easy, hearts }), 'boss');
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
    // On every card the arrow keys or the d-pad move between its controls (chooseOnCard). Enter or Start
    // presses the button chosen (go), and Space or A the control chosen (select); with none chosen, both
    // press the card's main button: Keep playing, Play!, Play again or Try again.
    if (this.paused) {
      if (c.pressed('pause')) this.setPaused(false);
      else if (c.pressed('start')) this.overlay.go();
      else if (c.pressed('jump')) this.overlay.select();
      else this.chooseOnCard(c);
      c.consumeJump(); // a press that worked the card must not also make Pip jump
    } else if (state === 'play' && c.pressed('pause')) {
      this.setPaused(true);
      this.overlay.choose(); // paused from the keyboard or a gamepad: start on "Keep playing"
    } else if (state === 'title' && (c.pressed('start') || c.pressed('shoot'))) {
      this.overlay.go();
    } else if (state === 'title' && c.pressed('jump')) {
      this.overlay.select();
    } else if ((state === 'win' || state === 'lose') && c.pressed('start')) {
      this.overlay.go();
    } else if ((state === 'win' || state === 'lose') && c.pressed('jump')) {
      // only a control the player has moved to: a jump still being mashed as the level ends does nothing
      this.overlay.select(false);
    } else {
      if (state === 'title' || state === 'win' || state === 'lose') this.chooseOnCard(c);
      stepped = this.advance(dt);
    }
    c.endFrame(!stepped && !this.paused && this.level.state === 'play');
    this.overlay.setState(this.paused ? 'paused' : this.level.state);
  }

  // The arrow keys or the d-pad: move between the controls on the card that is showing.
  private chooseOnCard(c: Controls) {
    if (c.pressed('left')) this.overlay.choose(-1, 0);
    else if (c.pressed('right')) this.overlay.choose(1, 0);
    else if (c.pressed('up')) this.overlay.choose(0, -1);
    else if (c.pressed('down')) this.overlay.choose(0, 1);
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
      this.overlay.showWin(e.result, best, save.recordWin(boss, e.result.time), this.path ?? undefined);
    } else if (e.type === 'stageClear' && this.level instanceof Stage) {
      save.recordStage(this.level.id, e.result.time);
      this.path = { name: this.level.name, time: e.result.time };
    } else if (e.type === 'stageExit') {
      this.startBoss(this.level.player.hp);
    } else if (e.type === 'lose') {
      this.lives--;
      this.overlay.showLose(e.progress, this.level instanceof Stage ? 'stage' : 'boss', this.lives);
    }
  }
}
