// What the game remembers between visits.
// localStorage can throw (private mode, blocked storage): never let that break the game.
const get = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const set = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

export const save = {
  get easy() {
    return get('sprout.easy') === '1';
  },
  set easy(on: boolean) {
    set('sprout.easy', on ? '1' : '0');
  },
  get muted() {
    return get('sprout.muted') === '1';
  },
  set muted(on: boolean) {
    set('sprout.muted', on ? '1' : '0');
  },
  // Best fight time in seconds, or null if the boss has never been beaten.
  get best(): number | null {
    const v = parseFloat(get('sprout.best') ?? '');
    return Number.isFinite(v) ? v : null;
  },
  set best(seconds: number | null) {
    if (seconds !== null) set('sprout.best', seconds.toFixed(1));
  },
};
