// The HTML layer over the game: title, win, lose and pause cards, plus the round sound and pause buttons.
import type { FightResult } from '../sim/events';

export type Card = 'title' | 'win' | 'lose' | 'pause';
// The stage a run came through on the way to the boss, for the win card: its name and how long it took.
export interface StagePath {
  name: string;
  time: number;
}

export interface OverlayHandlers {
  start(): void; // a new game, from its first level
  retry(): void; // the level that was lost, again; with no lives left, a new game
  restart(): void; // Start over: gives up this life for the level again
  resume(): void;
  pause(): void;
  title(): void;
  mute(): void;
  easy(on: boolean): void;
}

// Where something sits on the screen, as getBoundingClientRect() reports it.
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// The arrow keys and the d-pad move between a card's buttons as in a game's menu: from boxes[from] to the
// nearest box that lies wholly in the direction (dx, dy). Distance is the gap between the two boxes, with
// a gap to the side counting double, and the box that comes first wins a tie. Returns `from` when no box
// lies that way.
export function nearest(boxes: readonly Box[], from: number, dx: number, dy: number): number {
  const a = boxes[from];
  let best = from,
    bestGap = Infinity;
  boxes.forEach((b, i) => {
    const ahead =
        dx > 0 ? b.left - a.right : dx < 0 ? a.left - b.right : dy > 0 ? b.top - a.bottom : a.top - b.bottom,
      aside = dx
        ? Math.max(0, b.top - a.bottom, a.top - b.bottom)
        : Math.max(0, b.left - a.right, a.left - b.right),
      gap = ahead + aside * 2;
    if (i !== from && ahead > -1 && gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

// Where a card's main button is among its controls: the one pressed when the player hasn't moved to another
// (Play!, Try again, Play again or Keep playing). It is the first button; the Easy mode checkbox comes before
// it on the title and lose cards.
const main = (controls: readonly HTMLElement[]) => controls.findIndex((c) => c instanceof HTMLButtonElement);

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
    for (const id of ['btn-start', 'btn-again']) byId(id).addEventListener('click', handlers.start);
    byId('btn-retry').addEventListener('click', handlers.retry);
    byId('btn-restart').addEventListener('click', handlers.restart);
    byId('btn-resume').addEventListener('click', handlers.resume);
    byId('btn-title').addEventListener('click', handlers.title);
    // blur(): otherwise Space or Enter would "click" the focused button again mid-level
    byId('btn-pause').addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      handlers.pause();
    });
    byId('btn-mute').addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      handlers.mute();
    });
    // #overlay.nav: the player is choosing with the keyboard or a gamepad (see choose()). Tabbing chooses too;
    // a click or a touch stops it.
    window.addEventListener('keydown', (e) => e.key === 'Tab' && this.root.classList.add('nav'));
    window.addEventListener('pointerdown', () => this.root.classList.remove('nav'));
  }

  get easy() {
    return this.easyToggles[0].checked;
  }

  show(card: Card | null) {
    this.showing = card;
    this.root.classList.remove('nav');
    this.root.classList.toggle('hidden', !card);
    for (const [name, el] of Object.entries(this.cards)) el.classList.toggle('hidden', name !== card);
  }

  // Keyboard and gamepad players move between the card's controls (its buttons, and its Easy mode checkbox)
  // with the arrow keys or the d-pad. The one they are on has the browser's focus, outlined as when tabbing
  // to it, until a click or a touch (#overlay.nav in style.css). With no direction, or on the first press,
  // they start on the card's main button.
  choose(dx = 0, dy = 0) {
    const controls = this.controls(),
      // a checkbox goes by its label, the pill the player sees
      boxes = controls.map((c) => (c.closest('label') ?? c).getBoundingClientRect());
    let i = controls.findIndex((c) => c === document.activeElement);
    if (i < 0) i = main(controls);
    else if (dx || dy) i = nearest(boxes, i, dx, dy);
    if (!controls[i]) return;
    controls[i].focus({ preventScroll: true });
    this.root.classList.add('nav');
  }

  // Enter or Start: press the button the player has moved to on the card that is showing, or else its main
  // button. Never the checkbox, so a player who has just ticked Easy mode starts right away.
  go() {
    const controls = this.controls(),
      chosen = this.chosen(controls);
    (chosen instanceof HTMLButtonElement ? chosen : controls[main(controls)])?.click();
  }

  // Space or A: press, or tick, the control the player has moved to; with none, and orMain, press the card's
  // main button.
  select(orMain = true) {
    const controls = this.controls();
    (this.chosen(controls) ?? (orMain ? controls[main(controls)] : undefined))?.click();
  }

  // The card's buttons and checkbox.
  private controls(): HTMLElement[] {
    return this.showing ? [...this.cards[this.showing].querySelectorAll<HTMLElement>('button, input')] : [];
  }

  // The control the player has moved to and can see outlined, if any: with the arrow keys, the d-pad or Tab
  // since the card showed. One that merely has the focus after a click doesn't count: a ticked checkbox, or
  // Start over, which shows again on the next pause.
  private chosen(controls: HTMLElement[]) {
    return this.root.classList.contains('nav')
      ? controls.find((c) => c === document.activeElement)
      : undefined;
  }

  // path: how the stage before the boss went, if this run came that way.
  showWin(r: FightResult, best: number | null, isBest: boolean, path?: StagePath) {
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
    // the stage's own row under the boss's
    if (path) stats.push(el('i', 'break'), el('span', '', `${path.name} ${path.time.toFixed(1)}s`));
    byId('win-stats').replaceChildren(...stats);
    this.show('win');
  }

  // where: lost on the way to the boss (a stage) or against him. lives: how many Pip has left; with none
  // the game is over, and its button starts a new one from the first level.
  showLose(progress: number, where: 'stage' | 'boss', lives: number) {
    const over = lives <= 0,
      meter = el('div', 'meter'),
      fill = el('i', '');
    fill.style.width = `${progress}%`;
    meter.append(fill);
    byId('lose-title').textContent = over ? 'Game over' : 'Pip needs a nap';
    byId('lose-tip').hidden = over;
    byId('lose-over').hidden = !over;
    byId('lose-who').textContent = where === 'stage' ? 'The garden path is' : 'Sunny is';
    byId('btn-retry').textContent = over ? 'Start again' : 'Try again';
    const progressLine = el(
      'span',
      '',
      where === 'stage'
        ? `You made it ${progress}% of the way to Sunny!`
        : `You cheered Sunny up ${progress}% of the way!`,
    );
    byId('lose-progress').replaceChildren(
      progressLine,
      meter,
      ...(over ? [] : [el('span', 'lives', lives === 1 ? 'Last life!' : `${lives} lives left`)]),
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
