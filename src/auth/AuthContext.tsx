// Auth state shared across the app. Talks to the API layer (`src/api`) only —
// while USE_MOCK is on the calls are routed locally; flipping the flag points
// every endpoint at the real backend without touching this file.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type AuthUser } from '../api';

export type { AuthUser };

type AuthState = {
  user: AuthUser | null;
  /** True while the initial `GET /auth/me` is still in flight. Guards must
   *  wait on this before deciding to redirect — otherwise refreshing on a
   *  protected route bounces the user before the session check resolves. */
  bootstrapping: boolean;
  login: (mode?: 'login' | 'signup') => void; // opens the modal; submit is what hits the API
  logout: () => void;
  // Auth modal control — kept here so any page can `openAuth('login')`
  // (e.g. when a guard redirects an unauthenticated user).
  authOpen: boolean;
  authMode: 'login' | 'signup';
  openAuth: (mode?: 'login' | 'signup') => void;
  closeAuth: () => void;
  // Direct API setter — AuthModal calls this after `api.auth.login()` resolves
  // so the in-memory user matches what the (mock) backend returned.
  setUser: (u: AuthUser | null) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // On mount, ask the backend who we are. With USE_MOCK this just reads the
  // localStorage-backed mock store; with the real backend it hits /auth/me.
  // `bootstrapping` stays true until this resolves so route guards don't
  // redirect-then-correct on every refresh.
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/auth/kakao/callback' || path === '/auth/naver/callback') {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    api.auth.me()
      .then(u => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setBootstrapping(false); });
    return () => { cancelled = true; };
  }, []);

  const openAuth = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
  }, []);

  const login = useCallback((mode: 'login' | 'signup' = 'login') => openAuth(mode), [openAuth]);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => { /* ignore — local state is the source of truth */ });
    setUser(null);
  }, []);

  // Cross-component bridge: any descendant can dispatch CustomEvent('openAuth')
  // to trigger the modal without prop-drilling.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<'login' | 'signup' | undefined>).detail;
      openAuth(detail || 'login');
    };
    window.addEventListener('openAuth', handler);
    return () => window.removeEventListener('openAuth', handler);
  }, [openAuth]);

  return (
    <AuthCtx.Provider value={{ user, bootstrapping, login, logout, authOpen, authMode, openAuth, closeAuth, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
