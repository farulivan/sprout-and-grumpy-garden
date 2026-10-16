// The stage is sized in style.css (16:9, as big as the window allows), so the page is laid out before any
// script has run. This keeps --ui, how much the cards and touch buttons scale, in step with its size.
import { H } from '../config';
import { clamp } from '../sim/math';

export function initLayout(stage: HTMLElement) {
  const fit = () => stage.style.setProperty('--ui', clamp(stage.clientHeight / H, 0.45, 1.6).toFixed(3));
  new ResizeObserver(fit).observe(stage);
  fit();
}
