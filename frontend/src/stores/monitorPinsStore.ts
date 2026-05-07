import { create } from 'zustand';

const PREFIX = 'clueark_monitor_pins_v1';

type Persisted = { customized: boolean; ids: string[] };

function storageKey(userId: string) {
  return `${PREFIX}:${userId}`;
}

function read(userId: string): Persisted {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { customized: false, ids: [] };
    const p = JSON.parse(raw) as Persisted;
    if (typeof p.customized !== 'boolean' || !Array.isArray(p.ids)) return { customized: false, ids: [] };
    return {
      customized: p.customized,
      ids: p.ids.filter((x): x is string => typeof x === 'string').slice(0, 3),
    };
  } catch {
    return { customized: false, ids: [] };
  }
}

function write(userId: string, p: Persisted) {
  localStorage.setItem(storageKey(userId), JSON.stringify(p));
}

interface MonitorPinsState {
  userId: string | null;
  customized: boolean;
  ids: string[];
  hydrate: (userId: string | null) => void;
  setCustomPins: (ids: string[]) => void;
  resetToDefault: () => void;
}

export const useMonitorPinsStore = create<MonitorPinsState>((set, get) => ({
  userId: null,
  customized: false,
  ids: [],
  hydrate: (userId) => {
    if (!userId) {
      set({ userId: null, customized: false, ids: [] });
      return;
    }
    const p = read(userId);
    set({ userId, customized: p.customized, ids: p.ids });
  },
  setCustomPins: (ids) => {
    const uid = get().userId;
    if (!uid) return;
    const seen = new Set<string>();
    const nextIds: string[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      nextIds.push(id);
      if (nextIds.length >= 3) break;
    }
    const next = { customized: true, ids: nextIds };
    write(uid, next);
    set({ customized: true, ids: next.ids });
  },
  resetToDefault: () => {
    const uid = get().userId;
    if (!uid) return;
    const next = { customized: false, ids: [] as string[] };
    write(uid, next);
    set({ customized: false, ids: [] });
  },
}));
