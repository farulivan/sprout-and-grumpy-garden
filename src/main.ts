// Boot: wire the page, the input, the audio and the Phaser scenes to the App.
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { Core } from 'phaser';
import { App, type Played } from './app';
import { GameAudio } from './audio';
import { CHAPTERS } from './chapters';
import { Controls } from './controls';
import { createGame } from './game/createGame';
import { GamePresenter } from './game/presenter';
import { BootScene } from './game/scenes/BootScene';
import { FightScene } from './game/scenes/FightScene';
import { HudScene } from './game/scenes/HudScene';
import { StageScene } from './game/scenes/StageScene';
import { TitleScene } from './game/scenes/TitleScene';
import { CHAPTER_VIEWS } from './game/views/chapterViews';
import { Stage } from './sim/stage/stage';
import { Yard } from './sim/yard';
import { initLayout } from './ui/layout';
import { finishLoading } from './ui/loading';
import { initTouch } from './ui/touch';

const audio = new GameAudio();
const unlockAudio = () => audio.init(); // browsers only allow sound after a key press or touch
const controls = new Controls(unlockAudio);
const presenter = new GamePresenter(audio);

// Each chapter's stage and boss fight are drawn by scenes of its own, so a chapter's world is only made when
// it is first played, and scenes asleep draw nothing.
const fightKey = (chapter: number) => `fight-${CHAPTERS[chapter].id}`;
const stageKey = (chapter: number) => `stage-${CHAPTERS[chapter].id}`;
const PLAY_SCENES = CHAPTERS.flatMap((_, i) => [fightKey(i), stageKey(i)]);
const PAUSE_SCENES = [...PLAY_SCENES, 'hud'];
const LEVEL_SCENES = ['title', ...PLAY_SCENES];

const params = new URLSearchParams(location.search);
// ?debug&chapter=2: new games start at that chapter, for working on one that isn't live yet.
const firstChapter = params.has('debug') ? Number(params.get('chapter')) - 1 : 0;
const app = new App({
  controls,
  audio,
  presenter,
  skipIntro: params.has('skipintro'),
  firstChapter: CHAPTERS[firstChapter] ? firstChapter : 0,
  startAtBoss: params.has('debug') && params.has('boss'),
  onLevel: (level) => {
    presenter.reset();
    showSceneFor(level);
  },
  // pausing the scenes freezes everything they animate, not just the simulation
  onPause: (paused) => {
    for (const key of PAUSE_SCENES) {
      if (paused && game.scene.isActive(key)) game.scene.pause(key);
      else if (!paused && game.scene.isPaused(key)) game.scene.resume(key);
    }
  },
  onMute: (muted) => (game.sound.mute = muted),
});

// Pip's yard, a boss fight and a stage are drawn by scenes of their own: only the one being played runs. A
// paused scene can't be put to sleep, so it is resumed first; and run() would restart a scene that is
// already running, so it is only asked to start, wake or resume one that isn't.
function showSceneFor(level: Played) {
  const on =
    level instanceof Yard ? 'title' : level instanceof Stage ? stageKey(app.chapter) : fightKey(app.chapter);
  for (const off of LEVEL_SCENES) {
    if (off === on) continue;
    if (game.scene.isPaused(off)) game.scene.resume(off);
    if (game.scene.isActive(off)) game.scene.sleep(off);
  }
  if (!game.scene.isActive(on)) game.scene.run(on);
}

presenter.onHitStop = (seconds) => app.hitStop(seconds);

const stage = document.getElementById('stage') as HTMLElement;
initLayout(stage);
const levelScenes = CHAPTERS.flatMap(({ id }, i) => [
  new FightScene(fightKey(i), app, presenter, CHAPTER_VIEWS[id]),
  new StageScene(stageKey(i), app, presenter, CHAPTER_VIEWS[id]),
]);
// Drawn in this order, so the HUD is over every level.
const game = createGame('game-root', [
  new BootScene(audio),
  new TitleScene(app, presenter),
  ...levelScenes,
  new HudScene(app, presenter),
]);
// The App runs before the scenes each frame: it advances the simulation, then the scenes draw it.
game.events.on(Core.Events.STEP, (_time: number, deltaMs: number) => app.tick(deltaMs / 1000));
// The loading screen stays up until the title has been drawn once.
const loaded = () => {
  if (!game.scene.isActive('title')) return;
  game.events.off(Core.Events.POST_RENDER, loaded);
  finishLoading(stage);
};
game.events.on(Core.Events.POST_RENDER, loaded);

initTouch(controls, unlockAudio);
window.addEventListener('blur', () => app.setPaused(true)); // auto-pause when the tab/window loses focus
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.setPaused(true);
});

// Test hook: open the page with ?debug to get window.sprout. step() runs whole game frames without
// requestAnimationFrame, so it works in hidden/background tabs and automated tests.
if (params.has('debug')) {
  Object.assign(window, {
    sprout: {
      app,
      phaser: game,
      controls,
      input: controls.held,
      get game() {
        return app.level;
      },
      startGame: () => app.start(),
      toMenu: () => app.toTitle(),
      skipIntro: () => app.level instanceof Yard && app.level.skip(),
      startStage: () => app.startStage(),
      startBoss: (hearts?: number) => app.startBoss(hearts),
      setPaused: (paused: boolean) => app.setPaused(paused),
      // (a scene not played yet has no overlay: it reads ?hitboxes itself when it starts)
      hitboxes: (on = true) => {
        for (const scene of levelScenes) if (scene.hitboxes) scene.hitboxes.visible = on;
      },
      step(n = 1) {
        for (let i = 0; i < n; i++) game.step(performance.now(), 1000 / 60);
      },
    },
  });
}
