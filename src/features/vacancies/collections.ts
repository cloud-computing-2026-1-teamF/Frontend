import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

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

  useEffect(() => {
    let cancelled = false;
    api.vacancies.getShortlist()
      .then(ids => {
        if (cancelled) return;
        writeIds(SHORTLIST_KEY, ids);
      })
      .catch(() => { /* 미로그인·오프라인 등은 로컬 목록 유지 */ });
    return () => { cancelled = true };
  }, []);

  const toggleShortlist = useCallback((id: string): ToggleResult => {
    const prev = readIds(SHORTLIST_KEY);
    const next = toggleId(prev, id);
    writeIds(SHORTLIST_KEY, next);
    void api.vacancies.putShortlist(next).catch(() => {
      writeIds(SHORTLIST_KEY, prev);
      window.dispatchEvent(new Event(COLLECTION_EVENT));
    });
    return { ok: true };
  }, []);

  const removeShortlist = useCallback((id: string) => {
    const prev = readIds(SHORTLIST_KEY);
    const next = prev.filter(current => current !== id);
    writeIds(SHORTLIST_KEY, next);
    void api.vacancies.putShortlist(next).catch(() => {
      writeIds(SHORTLIST_KEY, prev);
      window.dispatchEvent(new Event(COLLECTION_EVENT));
    });
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

