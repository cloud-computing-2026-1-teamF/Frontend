// Auth state shared across the app. Pure mock — persists a fake user object
// in localStorage so reloads keep the "logged-in" feel. Replace login() body
// with a real API call when the backend lands.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { loginRequest, signUp } from '../lib/auth';

export type AuthUser = {
  name: string;
  email: string;
  password: string;
  tier: string;
  id?: string;
  accessToken?: string;
  refreshToken?: string;
};

type AuthState = {
  user: AuthUser | null;
  login: (mode?: 'login' | 'signup') => void; // demo: accepts any input
  logout: () => void;
  // Auth modal control — kept here so any page can `openAuth('login')`
  // (e.g. when a guard redirects an unauthenticated user)
  authOpen: boolean;
  authMode: 'login' | 'signup';
  openAuth: (mode?: 'login' | 'signup') => void;
  closeAuth: () => void;
};

const STORAGE_KEY = 'sg_user';

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const persist = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const openAuth = useCallback(async (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
    switch(mode) {
      case 'login':
        const res = await loginRequest(user.email, user.password);
        console.log(res);
        setUser({
          ...user,
          accessToken: res.tokens.acces_token,
          refreshToken: res.tokens.refresh_token,
        });
        break
      case 'signup':
        const userData = await signUp(user.accessToken, user.email, user.password, user.name);
        console.log(userData);
        setUser({
          ...user,
          accessToken: userData.tokens.access_token,
          name: userData.data.user.name,
          email: userData.data.user.email,
          tier: userData.data.user.tier,
          id: userData.data.user.id,
        });
        console.log('setUser completed.');
        login();
        break
    }
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    // demo auto-login on modal close (matches the v1 behaviour)
    persist({ name: '창업준비생', email: 'demo@sanggwon.ai', password: '1234', tier: 'Pro' });
  }, [persist]);

  const login = useCallback((mode: 'login' | 'signup' = 'login') => openAuth(mode), [openAuth]);

  const logout = useCallback(() => persist(null), [persist]);

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
    <AuthCtx.Provider value={{ user, login, logout, authOpen, authMode, openAuth, closeAuth }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
