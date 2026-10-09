// Boot: wire the page, the input, the audio and the Phaser scenes to the App.
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { Core } from 'phaser';
import { App } from './app';
import { GameAudio } from './audio';
import { Controls } from './controls';
import { createGame } from './game/createGame';
import { GamePresenter } from './game/presenter';
import { BootScene } from './game/scenes/BootScene';
import { FightScene } from './game/scenes/FightScene';
import { HudScene } from './game/scenes/HudScene';
import { initLayout } from './ui/layout';
import { initTouch } from './ui/touch';

const audio = new GameAudio();
const unlockAudio = () => audio.init(); // browsers only allow sound after a key press or touch
const controls = new Controls(unlockAudio);
const presenter = new GamePresenter(audio);

const app = new App({
  controls,
  audio,
  presenter,
  onFight: () => presenter.reset(),
  // pausing the scenes freezes everything they animate, not just the simulation
  onPause: (paused) => {
    for (const key of ['fight', 'hud']) {
      if (paused) game.scene.pause(key);
      else game.scene.resume(key);
    }
  },
  onMute: (muted) => (game.sound.mute = muted),
});

presenter.onHitStop = (seconds) => app.hitStop(seconds);

initLayout(document.getElementById('stage') as HTMLElement);
const fightScene = new FightScene(app, presenter);
const game = createGame('game-root', [new BootScene(audio), fightScene, new HudScene(app, presenter)]);
// The App runs before the scenes each frame: it advances the simulation, then the scenes draw it.
game.events.on(Core.Events.STEP, (_time: number, deltaMs: number) => app.tick(deltaMs / 1000));

initTouch(controls, unlockAudio);
window.addEventListener('blur', () => app.setPaused(true)); // auto-pause when the tab/window loses focus
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.setPaused(true);
});

// Test hook: open the page with ?debug to get window.sprout. step() runs whole game frames without
// requestAnimationFrame, so it works in hidden/background tabs and automated tests.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, {
    sprout: {
      app,
      phaser: game,
      controls,
      input: controls.held,
      get game() {
        return app.fight;
      },
      startGame: () => app.start(),
      setPaused: (paused: boolean) => app.setPaused(paused),
      hitboxes: (on = true) => (fightScene.hitboxes.visible = on),
      step(n = 1) {
        for (let i = 0; i < n; i++) game.step(performance.now(), 1000 / 60);
      },
    },
  });
}
