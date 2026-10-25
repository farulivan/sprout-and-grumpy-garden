// The HTML layer over the game: "Press any key" on the title, the main menu and its pages, the win, lose and
// pause cards, plus the round sound and pause buttons.
import type { FightResult } from '../sim/events';

export type Card = 'press' | 'menu' | Page | 'win' | 'lose' | 'pause';
// The pages the main menu's signpost opens. Back returns to the signpost.
export type Page = 'howto' | 'options' | 'credits';
const PAGES: readonly Page[] = ['howto', 'options', 'credits'];
const START_FLASH = 360; // milliseconds "Press any key" flashes for once pressed (the .go animation in style.css)
// The stage a run came through on the way to the boss, for the win card: its name and how long it took.
export interface StagePath {
  name: string;
  time: number;
}

export interface OverlayHandlers {
  play(): void; // Play on the main menu: Pip sets off down the garden path
  start(): void; // a new game, from its first level, straight away
  retry(): void; // the level that was lost, again; with no lives left, a new game
  restart(): void; // Start over: gives up this life for the level again
  resume(): void;
  pause(): void;
  title(): void; // back to the main menu
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

// A tilted button (the signpost's boards) has a box taller than itself, so boards one above the other seem
// to overlap. Going by the middle of each box leaves them apart.
const trim = (b: Box): Box => {
  const cut = (b.bottom - b.top) * 0.15;
  return { left: b.left, right: b.right, top: b.top + cut, bottom: b.bottom - cut };
};

// Where a card's main button is among its controls: the one pressed when the player hasn't moved to another
// (Play, Try again, Play again, Keep playing). It is the first button (the Easy mode checkbox comes before it
// on the lose card), except on a menu page, where it is Back.
const main = (controls: readonly HTMLElement[]) => {
  const back = controls.findIndex((c) => c.classList.contains('back'));
  return back >= 0 ? back : controls.findIndex((c) => c instanceof HTMLButtonElement);
};

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
    press: byId('press-card'),
    menu: byId('menu-card'),
    howto: byId('howto-card'),
    options: byId('options-card'),
    credits: byId('credits-card'),
    win: byId('win-card'),
    lose: byId('lose-card'),
    pause: byId('pause-card'),
  };
  private showing: Card | null = null;
  private arriving: ReturnType<typeof setTimeout> | undefined;
  private easyToggles = [...document.querySelectorAll<HTMLInputElement>('.easy-toggle')];

  constructor(handlers: OverlayHandlers, easy: boolean) {
    for (const el of this.easyToggles) {
      el.checked = easy;
      el.addEventListener('change', () => {
        for (const other of this.easyToggles) other.checked = el.checked; // the title and lose cards each have one
        handlers.easy(el.checked);
      });
    }
    byId('btn-play').addEventListener('click', handlers.play);
    byId('btn-again').addEventListener('click', handlers.start);
    byId('btn-retry').addEventListener('click', handlers.retry);
    byId('btn-restart').addEventListener('click', handlers.restart);
    byId('btn-resume').addEventListener('click', handlers.resume);
    for (const btn of this.root.querySelectorAll('.to-menu')) btn.addEventListener('click', handlers.title);
    // the signpost's planks open the menu's pages, and each page's Back returns to the signpost
    for (const plank of this.root.querySelectorAll<HTMLElement>('[data-page]'))
      plank.addEventListener('click', () => this.show(plank.dataset.page as Page));
    for (const btn of this.root.querySelectorAll('.back')) btn.addEventListener('click', () => this.back());
    byId('btn-sound').addEventListener('click', handlers.mute);
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
  get card() {
    return this.showing;
  }

  show(card: Card | null) {
    const was = this.showing,
      nav = this.root.classList.contains('nav');
    this.showing = card;
    this.root.classList.remove('nav');
    this.root.classList.toggle('hidden', !card);
    // the title and the signpost stand in the yard; every other card dims the game around it
    this.root.classList.toggle('dim', !!card && card !== 'press' && card !== 'menu');
    for (const [name, el] of Object.entries(this.cards)) el.classList.toggle('hidden', name !== card);
    // The click that passed "Press any key" must not also land on the signpost that appears under it.
    if (card === 'menu' && was === 'press') {
      clearTimeout(this.arriving);
      this.root.classList.add('arriving');
      this.arriving = setTimeout(() => this.root.classList.remove('arriving'), 400);
    }
    // Between the signpost and its pages, keyboard and gamepad players keep their place: a page opens on its
    // first control, and Back returns to the board that opened the page.
    if (nav && card && was && (card === 'menu' || PAGES.includes(card as Page))) {
      const to =
        card === 'menu' ? this.root.querySelector<HTMLElement>(`[data-page="${was}"]`) : this.controls()[0];
      to?.focus({ preventScroll: true });
      this.root.classList.add('nav');
    }
  }

  // "Press any key" pressed: it flashes twice, as an arcade's title does, then the signpost comes.
  started() {
    const press = this.cards.press;
    press.classList.add('go');
    setTimeout(() => {
      press.classList.remove('go');
      if (this.showing === 'press') this.show('menu');
    }, START_FLASH);
  }

  // Esc, Backspace or B on a menu page: back to the signpost. Returns whether there was a page to leave.
  back() {
    if (!PAGES.includes(this.showing as Page)) return false;
    this.show('menu');
    return true;
  }

  // Keyboard and gamepad players move between the card's controls (its buttons, and its Easy mode checkbox)
  // with the arrow keys or the d-pad. The one they are on has the browser's focus, outlined as when tabbing
  // to it, until a click or a touch (#overlay.nav in style.css). With no direction, or on the first press,
  // they start on the card's main button.
  choose(dx = 0, dy = 0) {
    const controls = this.controls(),
      // a checkbox goes by its label, the pill the player sees
      boxes = controls.map((c) => trim((c.closest('label') ?? c).getBoundingClientRect()));
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
    byId('btn-lose-menu').hidden = !over; // the game is over: a way back to the menu too
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
    const sound = byId('btn-sound');
    sound.textContent = muted ? 'Off' : 'On';
    sound.setAttribute('aria-pressed', String(!muted));
  }

  // CSS uses this to show the touch controls and HUD buttons only while playing.
  setState(state: string) {
    if (this.stage.dataset.state !== state) this.stage.dataset.state = state;
  }
}
