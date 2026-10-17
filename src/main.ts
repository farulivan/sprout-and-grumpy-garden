// Boot: wire the page, the input, the audio and the Phaser scenes to the App.
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { Core } from 'phaser';
import { App, type Played } from './app';
import { GameAudio } from './audio';
import { Controls } from './controls';
import { createGame } from './game/createGame';
import { GamePresenter } from './game/presenter';
import { BootScene } from './game/scenes/BootScene';
import { FightScene } from './game/scenes/FightScene';
import { HudScene } from './game/scenes/HudScene';
import { StageScene } from './game/scenes/StageScene';
import { Stage } from './sim/stage/stage';
import { initLayout } from './ui/layout';
import { finishLoading } from './ui/loading';
import { initTouch } from './ui/touch';

const audio = new GameAudio();
const unlockAudio = () => audio.init(); // browsers only allow sound after a key press or touch
const controls = new Controls(unlockAudio);
const presenter = new GamePresenter(audio);

const params = new URLSearchParams(location.search);
const app = new App({
  controls,
  audio,
  presenter,
  onLevel: (level) => {
    presenter.reset();
    showSceneFor(level);
  },
  // pausing the scenes freezes everything they animate, not just the simulation
  onPause: (paused) => {
    for (const key of ['fight', 'stage', 'hud']) {
      if (paused && game.scene.isActive(key)) game.scene.pause(key);
      else if (!paused && game.scene.isPaused(key)) game.scene.resume(key);
    }
  },
  onMute: (muted) => (game.sound.mute = muted),
});

// A boss fight and a stage are drawn by scenes of their own: only the one being played runs. A paused scene
// can't be put to sleep, so it is resumed first; and run() would restart a scene that is already running,
// so it is only asked to start, wake or resume one that isn't.
function showSceneFor(level: Played) {
  const [on, off] = level instanceof Stage ? ['stage', 'fight'] : ['fight', 'stage'];
  if (game.scene.isPaused(off)) game.scene.resume(off);
  if (game.scene.isActive(off)) game.scene.sleep(off);
  if (!game.scene.isActive(on)) game.scene.run(on);
}

presenter.onHitStop = (seconds) => app.hitStop(seconds);

const stage = document.getElementById('stage') as HTMLElement;
initLayout(stage);
const fightScene = new FightScene(app, presenter);
const stageScene = new StageScene(app, presenter);
const game = createGame('game-root', [
  new BootScene(audio),
  fightScene,
  stageScene,
  new HudScene(app, presenter),
]);
// The App runs before the scenes each frame: it advances the simulation, then the scenes draw it.
game.events.on(Core.Events.STEP, (_time: number, deltaMs: number) => app.tick(deltaMs / 1000));
// The loading screen stays up until the garden has been drawn once.
const loaded = () => {
  if (!game.scene.isActive('fight')) return;
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
      startStage: () => app.startStage(),
      startBoss: (hearts?: number) => app.startBoss(hearts),
      setPaused: (paused: boolean) => app.setPaused(paused),
      hitboxes: (on = true) => (fightScene.hitboxes.visible = stageScene.hitboxes.visible = on),
      step(n = 1) {
        for (let i = 0; i < n; i++) game.step(performance.now(), 1000 / 60);
      },
    },
  });
}
