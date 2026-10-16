// The HTML layer over the game: title, win, lose and pause cards, plus the round sound and pause buttons.
import type { FightResult } from '../sim/events';

export type Card = 'title' | 'win' | 'lose' | 'pause';

export interface OverlayHandlers {
  start(): void;
  resume(): void;
  pause(): void;
  title(): void;
  mute(): void;
  easy(on: boolean): void;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = (tag: string, className: string, text = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

export class Overlay {
  private stage = byId('stage');
  private root = byId('overlay');
  private cards: Record<Card, HTMLElement> = {
    title: byId('title-card'),
    win: byId('win-card'),
    lose: byId('lose-card'),
    pause: byId('pause-card'),
  };
  private showing: Card | null = null;
  private easyToggles = [...document.querySelectorAll<HTMLInputElement>('.easy-toggle')];

  constructor(handlers: OverlayHandlers, easy: boolean) {
    for (const el of this.easyToggles) {
      el.checked = easy;
      el.addEventListener('change', () => {
        for (const other of this.easyToggles) other.checked = el.checked; // the title and lose cards each have one
        handlers.easy(el.checked);
      });
    }
    for (const id of ['btn-start', 'btn-again', 'btn-retry', 'btn-restart'])
      byId(id).addEventListener('click', handlers.start);
    byId('btn-resume').addEventListener('click', handlers.resume);
    byId('btn-title').addEventListener('click', handlers.title);
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
    this.showing = card;
    this.root.classList.toggle('hidden', !card);
    for (const [name, el] of Object.entries(this.cards)) el.classList.toggle('hidden', name !== card);
  }

  // Press the button the player has tabbed to on the card that is showing, or else its first one.
  press() {
    const buttons = this.buttons();
    (buttons.find((b) => b === document.activeElement) ?? buttons[0])?.click();
  }

  private buttons(): HTMLButtonElement[] {
    return this.showing ? [...this.cards[this.showing].querySelectorAll('button')] : [];
  }

  showWin(r: FightResult, best: number | null, isBest: boolean) {
    // Each star earned pops in, one after another (see .star.on in style.css).
    byId('win-stars').replaceChildren(
      ...[1, 2, 3].map((n) => el('span', n <= r.stars ? 'star on' : 'star', '★')),
    );
    const stats = [
      el('span', '', `Time ${r.time.toFixed(1)}s`),
      isBest || best === null ? el('span', 'best', 'New best!') : el('span', '', `Best ${best.toFixed(1)}s`),
      el('span', '', `Bonks ${r.hits}`),
    ];
    if (r.easy) stats.push(el('span', '', 'Easy mode'));
    byId('win-stats').replaceChildren(...stats);
    this.show('win');
  }

  showLose(progress: number) {
    const meter = el('div', 'meter'),
      fill = el('i', '');
    fill.style.width = `${progress}%`;
    meter.append(fill);
    byId('lose-progress').replaceChildren(
      el('span', '', `You cheered Sunny up ${progress}% of the way!`),
      meter,
    );
    this.show('lose');
  }

  setMuted(muted: boolean) {
    byId('btn-mute').classList.toggle('muted', muted); // the button holds both icons; CSS shows one
  }

  // CSS uses this to show the touch controls and HUD buttons only while playing.
  setState(state: string) {
    if (this.stage.dataset.state !== state) this.stage.dataset.state = state;
  }
}
