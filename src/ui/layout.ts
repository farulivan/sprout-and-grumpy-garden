// Sizes the stage to the window. Everything in it (the game canvas, the cards, the touch buttons) follows.
import { H, W } from '../config';
import { clamp } from '../sim/math';

export function initLayout(stage: HTMLElement) {
  const resize = () => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.97;
    stage.style.width = Math.round(W * s) + 'px';
    stage.style.height = Math.round(H * s) + 'px';
    stage.style.setProperty('--ui', clamp(s, 0.45, 1.6).toFixed(3)); // cards + touch buttons scale with the game
  };
  window.addEventListener('resize', resize);
  resize();
}
