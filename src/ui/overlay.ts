// The HTML layer over the game: title, win, lose and pause cards, plus the round sound and pause buttons.
import type { FightResult } from '../sim/events';

export type Card = 'title' | 'win' | 'lose' | 'pause';

export interface OverlayHandlers {
  start(): void;
  resume(): void;
  pause(): void;
  mute(): void;
  easy(on: boolean): void;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class Overlay {
  private stage = byId('stage');
  private root = byId('overlay');
  private cards: Record<Card, HTMLElement> = {
    title: byId('title-card'),
    win: byId('win-card'),
    lose: byId('lose-card'),
    pause: byId('pause-card'),
  };
  private easyToggles = [...document.querySelectorAll<HTMLInputElement>('.easy-toggle')];

  constructor(handlers: OverlayHandlers, easy: boolean) {
    for (const el of this.easyToggles) {
      el.checked = easy;
      el.addEventListener('change', () => {
        for (const other of this.easyToggles) other.checked = el.checked; // the title and lose cards each have one
        handlers.easy(el.checked);
      });
    }
    for (const id of ['btn-start', 'btn-again', 'btn-retry'])
      byId(id).addEventListener('click', handlers.start);
    byId('btn-resume').addEventListener('click', handlers.resume);
    // blur(): otherwise Space or Enter would "click" the focused button again mid-fight
    byId('btn-pause').addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      handlers.pause();
    });
    byId('btn-mute').addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      handlers.mute();
    });
  }

  get easy() {
    return this.easyToggles[0].checked;
  }

  show(card: Card | null) {
    this.root.classList.toggle('hidden', !card);
    for (const [name, el] of Object.entries(this.cards)) el.classList.toggle('hidden', name !== card);
  }

  showWin(r: FightResult, best: number | null, isBest: boolean) {
    byId('win-stars').textContent = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    const bestText = isBest || best === null ? ' (new best!)' : `  ·  Best: ${best.toFixed(1)}s`;
    byId('win-stats').textContent =
      `Time: ${r.time.toFixed(1)}s${bestText}  ·  Bonks: ${r.hits}${r.easy ? '  ·  Easy mode' : ''}`;
    this.show('win');
  }

  showLose(progress: number) {
    byId('lose-progress').textContent = `You cheered Sunny up ${progress}% of the way!`;
    this.show('lose');
  }

  setMuted(muted: boolean) {
    byId('btn-mute').textContent = muted ? '🔇' : '🔊';
  }

  // CSS uses this to show the touch controls and HUD buttons only while playing.
  setState(state: string) {
    if (this.stage.dataset.state !== state) this.stage.dataset.state = state;
  }
}
