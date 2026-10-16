// The loading screen is plain HTML and CSS (#loading in index.html), so it shows from the very first paint,
// while the script is still on its way. Once the garden has been drawn, it fades out as the title card pops
// in, and then it is removed.
const FADE_MS = 400; // the transition on #loading in style.css

export function finishLoading(stage: HTMLElement) {
  stage.classList.add('loaded');
  const screen = document.getElementById('loading');
  if (screen) setTimeout(() => screen.remove(), FADE_MS + 100);
}
