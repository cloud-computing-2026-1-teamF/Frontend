import { useCallback, useEffect, useState } from 'react';
import { ApiError, shortlistApi } from '../../api';

// `shortlistIds` is persisted server-side via /v1/users/me/shortlist; we keep a
// per-tab in-memory mirror that the UI subscribes to. `compareIds` stays in
// localStorage (scratch list for the compare workflow).

const COMPARE_KEY = 'sanggwon_compare_vacancy_ids';
const COLLECTION_EVENT = 'sanggwon:vacancy-collections-changed';

export const MAX_COMPARE_VACANCIES = 4;
export const MIN_COMPARE_VACANCIES = 2;

export type VacancyCollectionState = {
  shortlistIds: string[];
  shortlistReady: boolean;
  compareIds: string[];
};

export type ToggleResult = {
  ok: boolean;
  reason?: 'compare_limit' | 'network_error';
};

let shortlistCache: string[] = [];
let shortlistReady = false;
let shortlistInFlight: Promise<string[]> | null = null;

function dispatchChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COLLECTION_EVENT));
  }
}

async function fetchShortlist(): Promise<string[]> {
  if (shortlistInFlight) return shortlistInFlight;
  shortlistInFlight = shortlistApi.list()
    .then(rows => {
      shortlistCache = rows.map(r => r.vacancyId);
      shortlistReady = true;
      dispatchChange();
      return shortlistCache;
    })
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        shortlistCache = [];
      }
      shortlistReady = true;
      dispatchChange();
      return shortlistCache;
    })
    .finally(() => { shortlistInFlight = null; });
  return shortlistInFlight;
}

export function useVacancyCollections() {
  const [state, setState] = useState<VacancyCollectionState>(() => ({
    shortlistIds: shortlistCache,
    shortlistReady,
    compareIds: readIds(COMPARE_KEY),
  }));

  useEffect(() => {
    const refresh = () => setState({
      shortlistIds: shortlistCache,
      shortlistReady,
      compareIds: readIds(COMPARE_KEY),
    });
    window.addEventListener('storage', refresh);
    window.addEventListener(COLLECTION_EVENT, refresh);
    if (!shortlistReady) {
      void fetchShortlist();
    }
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(COLLECTION_EVENT, refresh);
    };
  }, []);

  const toggleShortlist = useCallback(async (id: string): Promise<ToggleResult> => {
    const isShortlisted = shortlistCache.includes(id);
    const previous = shortlistCache;
    shortlistCache = isShortlisted
      ? shortlistCache.filter(current => current !== id)
      : [...shortlistCache, id];
    dispatchChange();
    try {
      if (isShortlisted) {
        await shortlistApi.remove(id);
      } else {
        await shortlistApi.add(id);
      }
      return { ok: true };
    } catch (err) {
      shortlistCache = previous;
      dispatchChange();
      return {
        ok: false,
        reason: err instanceof ApiError && err.status === 401 ? undefined : 'network_error',
      };
    }
  }, []);

  const removeShortlist = useCallback(async (id: string) => {
    const previous = shortlistCache;
    shortlistCache = shortlistCache.filter(current => current !== id);
    dispatchChange();
    try {
      await shortlistApi.remove(id);
    } catch {
      shortlistCache = previous;
      dispatchChange();
    }
  }, []);

  const toggleCompare = useCallback((id: string): ToggleResult => {
    const current = readIds(COMPARE_KEY);
    if (current.includes(id)) {
      writeIds(COMPARE_KEY, current.filter(currentId => currentId !== id));
      return { ok: true };
    }
    if (current.length >= MAX_COMPARE_VACANCIES) {
      return { ok: false, reason: 'compare_limit' };
    }
    writeIds(COMPARE_KEY, [...current, id]);
    return { ok: true };
  }, []);

  const removeCompare = useCallback((id: string) => {
    writeIds(COMPARE_KEY, readIds(COMPARE_KEY).filter(current => current !== id));
  }, []);

  const clearCompare = useCallback(() => {
    writeIds(COMPARE_KEY, []);
  }, []);

  return {
    ...state,
    toggleShortlist,
    removeShortlist,
    toggleCompare,
    removeCompare,
    clearCompare,
  };
}

export function readVacancyCollections(): VacancyCollectionState {
  return {
    shortlistIds: shortlistCache,
    shortlistReady,
    compareIds: readIds(COMPARE_KEY),
  };
}

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  try {
    localStorage.setItem(key, JSON.stringify(uniqueIds));
    dispatchChange();
  } catch {
    // private mode / quota
  }
}
