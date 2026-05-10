import { useCallback, useEffect, useState } from 'react';

const SHORTLIST_KEY = 'sanggwon_shortlisted_vacancy_ids';
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
  reason?: 'compare_limit';
};

export function useVacancyCollections() {
  const [state, setState] = useState<VacancyCollectionState>(() => readVacancyCollections());

  useEffect(() => {
    const refresh = () => setState(readVacancyCollections());
    window.addEventListener('storage', refresh);
    window.addEventListener(COLLECTION_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(COLLECTION_EVENT, refresh);
    };
  }, []);

  const toggleShortlist = useCallback((id: string): ToggleResult => {
    const next = toggleId(readIds(SHORTLIST_KEY), id);
    writeIds(SHORTLIST_KEY, next);
    return { ok: true };
  }, []);

  const removeShortlist = useCallback((id: string) => {
    writeIds(SHORTLIST_KEY, readIds(SHORTLIST_KEY).filter(current => current !== id));
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
    shortlistIds: readIds(SHORTLIST_KEY),
    compareIds: readIds(COMPARE_KEY),
  };
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id];
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
    window.dispatchEvent(new Event(COLLECTION_EVENT));
  } catch {
    // Keep the app usable in private mode or quota-constrained browsers.
  }
}

