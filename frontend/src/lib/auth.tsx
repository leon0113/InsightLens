'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  hasAccessToken,
  setSessionExpiredHandler,
} from '@/lib/api/client';
import type { User } from '@/lib/api/types';

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  ensureSession: () => void;
  logIn: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const restoreStarted = useRef(false);

  const signOutLocally = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  const loadUser = useCallback(async () => {
    setUser(await api.users.me());
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(signOutLocally);
    return () => setSessionExpiredHandler(null);
  }, [signOutLocally]);

  // Public pages never call this, so visitors without an account do not
  // send a refresh request that can only fail.
  const ensureSession = useCallback(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    (async () => {
      try {
        const restored = hasAccessToken() || (await api.auth.restoreSession());
        if (restored) {
          await loadUser();
        } else {
          setStatus('anonymous');
        }
      } catch {
        setStatus('anonymous');
      }
    })();
  }, [loadUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      ensureSession,
      logIn: async (input) => {
        await api.auth.login(input);
        restoreStarted.current = true;
        await loadUser();
      },
      register: async (input) => {
        await api.auth.register(input);
        restoreStarted.current = true;
        await loadUser();
      },
      logOut: async () => {
        try {
          await api.auth.logOut();
        } catch {
          // The local session ends either way; an expired token cannot log out.
        }
        signOutLocally();
      },
    }),
    [status, user, ensureSession, loadUser, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Auth state for a page that needs to know whether someone is signed in. */
export function useSession() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useSession must be used inside AuthProvider');
  }
  const { ensureSession } = auth;
  useEffect(() => {
    ensureSession();
  }, [ensureSession]);
  return auth;
}

/**
 * Only same-site paths are accepted after sign-in. Anything else, such as
 * "//evil.example", "/\evil.example" (browsers read the backslash as a slash)
 * or "https://...", would turn the login page into an open redirect.
 */
export function safeNextPath(next: string | null): string {
  if (next && /^\/(?![/\\])/.test(next)) {
    return next;
  }
  return '/datasets';
}
