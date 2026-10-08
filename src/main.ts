// Boot: wire the page, the input, the audio and the renderer to the App, then run the frame loop.
import { App } from './app';
import { GameAudio } from './audio';
import { createCanvasRenderer } from './canvas/renderer';
import { STEP } from './config';
import { Controls } from './controls';
import { initLayout } from './ui/layout';
import { initTouch } from './ui/touch';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLElement;

const audio = new GameAudio();
const unlockAudio = () => audio.init(); // browsers only allow sound after a key press or touch
const controls = new Controls(unlockAudio);
const renderer = createCanvasRenderer(canvas, audio);
const app = new App({ controls, audio, presenter: renderer.presenter, onFight: () => renderer.reset() });

initLayout(stage, (cssScale) => renderer.resize(cssScale));
initTouch(controls, unlockAudio);
window.addEventListener('blur', () => app.setPaused(true)); // auto-pause when the tab/window loses focus
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.setPaused(true);
});

// Test hook: open the page with ?debug to get window.sprout. step() advances the simulation without
// requestAnimationFrame, so it works in hidden/background tabs and automated tests.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, {
    sprout: {
      app,
      controls,
      input: controls.held,
      get game() {
        return app.fight;
      },
      startGame: () => app.start(),
      setPaused: (paused: boolean) => app.setPaused(paused),
      step(n = 1) {
        for (let i = 0; i < n; i++) {
          app.tick(STEP);
          renderer.update(STEP, app.fight, app.paused);
        }
        renderer.render(app.fight, 1);
      },
    },
  });
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  app.tick(dt);
  renderer.update(dt, app.fight, app.paused);
  renderer.render(app.fight, app.alpha);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
