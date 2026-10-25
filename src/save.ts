// What the game remembers between visits: one versioned object in localStorage.
// Storage can be missing or throw (private mode, blocked storage): never let that break the game.
//
// A browser keeps one localStorage per domain, whatever folder a page is in. So two copies of the game
// on the same domain (an old version kept online at /v1/ beside the new one, say) would share a save.
// A build can name a slot to keep its own instead: VITE_SAVE_SLOT=v1 makes the key 'sprout.save.v1'.
import type { BossId } from './sim/bosses';
import type { StageId } from './sim/stage/stages';

interface StageRecord {
  best: number; // fastest clear, in seconds
}
// How loud the music and the sound effects are, 0 to 1 (Options).
export interface Volumes {
  music: number;
  sfx: number;
}
export const DEFAULT_VOLUMES: Volumes = { music: 0.8, sfx: 1 };
interface SaveData {
  v: 1;
  easy: boolean;
  muted: boolean;
  volume: Volumes; // saves from before Options had none, and get the defaults
  best: Partial<Record<BossId, number>>; // fastest win per boss, in seconds
  stages: Partial<Record<StageId, StageRecord>>; // stages cleared
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
    const data: SaveData = {
      v: 1,
      easy: false,
      muted: false,
      volume: { ...DEFAULT_VOLUMES },
      best: {},
      stages: {},
    };
    try {
      const saved = JSON.parse(read(key) ?? 'null') as Partial<SaveData> | null;
      if (saved && typeof saved === 'object') {
        data.easy = saved.easy === true;
        data.muted = saved.muted === true;
        for (const which of ['music', 'sfx'] as const) {
          const level = saved.volume?.[which];
          if (typeof level === 'number' && Number.isFinite(level)) data.volume[which] = clamp01(level);
        }
        for (const [boss, time] of Object.entries(saved.best ?? {}))
          if (typeof time === 'number' && Number.isFinite(time)) data.best[boss as BossId] = time;
        // saves from before there were stages have none
        for (const [stage, record] of Object.entries(saved.stages ?? {}))
          if (typeof record?.best === 'number' && Number.isFinite(record.best))
            data.stages[stage as StageId] = { best: record.best };
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
    volume(which: keyof Volumes): number {
      return data.volume[which];
    },
    setVolume(which: keyof Volumes, level: number) {
      data.volume[which] = clamp01(level);
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
    // Fastest clear of this stage in seconds, or null if it has never been cleared.
    stageBest(id: StageId): number | null {
      return data.stages[id]?.best ?? null;
    },
    // Records a cleared stage's time if it beats the best so far. Returns whether it did.
    recordStage(id: StageId, seconds: number): boolean {
      const best = data.stages[id]?.best;
      if (best !== undefined && best <= seconds) return false;
      data.stages[id] = { best: Math.round(seconds * 10) / 10 };
      write();
      return true;
    },
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function browserStorage(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const save = createSave(browserStorage(), import.meta.env.VITE_SAVE_SLOT?.trim());
