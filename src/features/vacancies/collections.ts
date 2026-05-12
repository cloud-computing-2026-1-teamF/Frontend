import { useCallback, useEffect, useState } from 'react';
import { ApiError, shortlistApi } from '../../api';

// `shortlistIds` is now persisted server-side via /v1/users/me/shortlist; we
// keep a per-tab in-memory mirror that the UI subscribes to so multiple
// components stay in sync after a toggle. `compareIds` is a scratch list for
// the compare workflow — it stays in localStorage because there's no need to
// share it across devices and persisting per-row toggles would just be noise.

const COMPARE_KEY = 'sanggwon_compare_vacancy_ids';
const COLLECTION_EVENT = 'sanggwon:vacancy-collections-changed';

export const MAX_COMPARE_VACANCIES = 4;
export const MIN_COMPARE_VACANCIES = 2;

export type VacancyCollectionState = {
  shortlistIds: string[];
  compareIds: string[];
};

export type ToggleResult = {
  ok: boolean;
  reason?: 'compare_limit' | 'network_error';
};

// ── Module-level cache for shortlist (single source of truth across hooks)
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
      // 401 (no session) is expected for anonymous visitors — treat as empty.
      // Any other failure leaves the cache as-is so the UI keeps working.
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
    compareIds: readIds(COMPARE_KEY),
  }));

  useEffect(() => {
    const refresh = () => setState({
      shortlistIds: shortlistCache,
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
    // Optimistic update so the icon flips immediately. Roll back on failure.
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

// One-shot reader used by code outside the hook (e.g. Compare page header).
export function readVacancyCollections(): VacancyCollectionState {
  return {
    shortlistIds: shortlistCache,
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
    // Keep the app usable in private mode or quota-constrained browsers.
  }
}
