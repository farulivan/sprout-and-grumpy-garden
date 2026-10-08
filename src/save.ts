// What the game remembers between visits: one versioned object in localStorage.
// Storage can be missing or throw (private mode, blocked storage): never let that break the game.
import type { BossId } from './sim/bosses';

interface SaveData {
  v: 1;
  easy: boolean;
  muted: boolean;
  best: Partial<Record<BossId, number>>; // fastest win per boss, in seconds
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY = 'sprout.save';
// The original game kept three separate keys. They are read once, then removed.
const OLD = { easy: 'sprout.easy', muted: 'sprout.muted', best: 'sprout.best' };

export function createSave(store: Store | null) {
  const read = (key: string) => {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };

  function load(): SaveData {
    const data: SaveData = { v: 1, easy: false, muted: false, best: {} };
    try {
      const saved = JSON.parse(read(KEY) ?? 'null') as Partial<SaveData> | null;
      if (saved && typeof saved === 'object') {
        data.easy = saved.easy === true;
        data.muted = saved.muted === true;
        for (const [boss, time] of Object.entries(saved.best ?? {}))
          if (typeof time === 'number' && Number.isFinite(time)) data.best[boss as BossId] = time;
        return data;
      }
    } catch {
      /* unreadable save: start fresh */
    }
    // first run of this version: bring over what the original game stored
    data.easy = read(OLD.easy) === '1';
    data.muted = read(OLD.muted) === '1';
    const oldBest = parseFloat(read(OLD.best) ?? '');
    if (Number.isFinite(oldBest)) data.best.sunny = oldBest;
    return data;
  }

  const data = load();
  const write = () => {
    try {
      store?.setItem(KEY, JSON.stringify(data));
      for (const key of Object.values(OLD)) store?.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  return {
    get easy() {
      return data.easy;
    },
    set easy(on: boolean) {
      data.easy = on;
      write();
    },
    get muted() {
      return data.muted;
    },
    set muted(on: boolean) {
      data.muted = on;
      write();
    },
    // Fastest win against this boss in seconds, or null if it has never been beaten.
    best(boss: BossId): number | null {
      return data.best[boss] ?? null;
    },
    // Records the time if it beats the best so far. Returns whether it did.
    recordWin(boss: BossId, seconds: number): boolean {
      const best = data.best[boss];
      if (best !== undefined && best <= seconds) return false;
      data.best[boss] = Math.round(seconds * 10) / 10;
      write();
      return true;
    },
  };
}

function browserStorage(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const save = createSave(browserStorage());
