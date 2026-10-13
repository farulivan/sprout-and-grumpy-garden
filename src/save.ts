// What the game remembers between visits: one versioned object in localStorage.
// Storage can be missing or throw (private mode, blocked storage): never let that break the game.
//
// A browser keeps one localStorage per domain, whatever folder a page is in. So two copies of the game
// on the same domain (an old version kept online at /v1/ beside the new one, say) would share a save.
// A build can name a slot to keep its own instead: VITE_SAVE_SLOT=v1 makes the key 'sprout.save.v1'.
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

// slot = '' for the game's main save. A build with a slot touches nothing outside it: it neither
// brings over nor removes the original game's keys, which belong to the main save.
export function createSave(store: Store | null, slot = '') {
  const key = slot ? `${KEY}.${slot}` : KEY;
  const read = (name: string) => {
    try {
      return store?.getItem(name) ?? null;
    } catch {
      return null;
    }
  };

  function load(): SaveData {
    const data: SaveData = { v: 1, easy: false, muted: false, best: {} };
    try {
      const saved = JSON.parse(read(key) ?? 'null') as Partial<SaveData> | null;
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
    if (slot) return data;
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
      store?.setItem(key, JSON.stringify(data));
      if (!slot) for (const old of Object.values(OLD)) store?.removeItem(old);
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

export const save = createSave(browserStorage(), import.meta.env.VITE_SAVE_SLOT?.trim());
