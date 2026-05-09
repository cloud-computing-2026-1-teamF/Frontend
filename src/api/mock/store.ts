// localStorage-backed mock store. Centralises all the keys the demo data
// lives under so the rest of the app never reads `localStorage` directly.

import type { SavedAnalysis } from '../../lib/savedAnalyses';
import type { AuthUser } from '../types';
import { HISTORY_ITEMS } from '../../data/history';

const KEYS = {
  user: 'sg_user',
  saved: 'sanggwon_saved_analyses',
  hidden: 'sanggwon_hidden_history_ids',
  accounts: 'sg_accounts',
} as const;

// ── Accounts (mock 회원 DB) ────────────────────────────────────────────────
// 실제 백엔드 연동 전까지 가입된 회원 정보를 들고 있는 시드. 비밀번호는 데모
// 목적이라 평문으로 보관 — 실서비스에서는 해시 처리 필요.
export type MockAccount = {
  login_id: string;   // 일반 로그인용 아이디 (이메일이 아님)
  password: string;
  user: AuthUser;
};

const SEED_ACCOUNTS: MockAccount[] = [
  {
    login_id: 'qwer1234',
    password: 'qwer1234',
    user: {
      id: 'usr_seed_qwer1234',
      email: 'qwer1234@example.com',
      name: '창업준비생',
      tier: 'pro',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
];

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};

const writeJSON = (key: string, val: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch { /* ignore quota / serialisation errors */ }
};

// ── User ──────────────────────────────────────────────────────────────────
export const getUser = (): AuthUser | null => readJSON<AuthUser | null>(KEYS.user, null);
export const setUser = (u: AuthUser | null): void => {
  if (u) writeJSON(KEYS.user, u);
  else localStorage.removeItem(KEYS.user);
};

// ── Accounts ──────────────────────────────────────────────────────────────
const getStoredAccounts = (): MockAccount[] => readJSON<MockAccount[]>(KEYS.accounts, []);
const setStoredAccounts = (list: MockAccount[]): void => writeJSON(KEYS.accounts, list);

/** 시드 + localStorage에 추가된 가입 계정을 합쳐 반환. 같은 login_id면
 *  저장된 쪽이 우선 (사용자가 비번을 바꾸면 그 값이 유효해야 하므로). */
const allAccounts = (): MockAccount[] => {
  const stored = getStoredAccounts();
  const ids = new Set(stored.map(a => a.login_id));
  return [...stored, ...SEED_ACCOUNTS.filter(a => !ids.has(a.login_id))];
};

export const findAccount = (loginId: string, password: string): MockAccount | undefined =>
  allAccounts().find(a => a.login_id === loginId && a.password === password);

export const accountExists = (loginId: string): boolean =>
  allAccounts().some(a => a.login_id === loginId);

export const insertAccount = (acct: MockAccount): void => {
  setStoredAccounts([acct, ...getStoredAccounts().filter(a => a.login_id !== acct.login_id)]);
};

// ── Analyses ──────────────────────────────────────────────────────────────
// Live list = items the user "created" via POST /analyses.
const getCreated = (): SavedAnalysis[] => readJSON<SavedAnalysis[]>(KEYS.saved, []);
const setCreated = (items: SavedAnalysis[]): void => writeJSON(KEYS.saved, items);

// Hidden seed IDs = soft-deleted demo rows. Mirrors the legacy History.tsx
// behaviour so existing user state survives this refactor.
const getHidden = (): number[] => readJSON<number[]>(KEYS.hidden, []);
const setHidden = (ids: number[]): void => writeJSON(KEYS.hidden, ids);

/** Combined view across user-created + seed, with hidden IDs filtered out. */
export const listAnalyses = (): SavedAnalysis[] => {
  const hidden = new Set(getHidden());
  return [...getCreated(), ...HISTORY_ITEMS].filter(it => {
    const numericId = Number(it.id);
    return Number.isNaN(numericId) || !hidden.has(numericId);
  });
};

export const findAnalysis = (id: number | string): SavedAnalysis | undefined =>
  listAnalyses().find(it => String(it.id) === String(id));

export const insertAnalysis = (a: SavedAnalysis): SavedAnalysis => {
  setCreated([a, ...getCreated()]);
  return a;
};

export const patchAnalysis = (id: number | string, patch: Partial<SavedAnalysis>): SavedAnalysis | undefined => {
  const created = getCreated();
  const idx = created.findIndex(it => String(it.id) === String(id));
  if (idx >= 0) {
    const next = { ...created[idx], ...patch };
    const list = [...created];
    list[idx] = next;
    setCreated(list);
    return next;
  }
  // Seed rows are read-only; we synthesise the patched view but don't persist
  // (matches what a real backend would do for "demo" rows it doesn't own).
  const seed = HISTORY_ITEMS.find(it => String(it.id) === String(id));
  return seed ? { ...seed, ...patch } : undefined;
};

export const removeAnalysis = (id: number | string): boolean => {
  const created = getCreated();
  if (created.some(it => String(it.id) === String(id))) {
    setCreated(created.filter(it => String(it.id) !== String(id)));
    return true;
  }
  if (HISTORY_ITEMS.some(it => String(it.id) === String(id))) {
    const hidden = getHidden();
    const numericId = Number(id);
    if (!Number.isNaN(numericId) && !hidden.includes(numericId)) setHidden([...hidden, numericId]);
    return true;
  }
  return false;
};
