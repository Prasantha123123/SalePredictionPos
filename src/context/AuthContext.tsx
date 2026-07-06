import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../lib/navigation';

type User = {
  name: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const storageKeys = {
  user: 'smart-pos-user',
  token: 'smart-pos-token',
};

function detectRole(email: string): Role {
  const normalized = email.toLowerCase();

  if (normalized.includes('admin')) {
    return 'administrator';
  }

  if (normalized.includes('manager')) {
    return 'manager';
  }

  return 'cashier';
}

function getInitialUser(): User | null {
  const raw = localStorage.getItem(storageKeys.user);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKeys.token));

  useEffect(() => {
    if (user) {
      localStorage.setItem(storageKeys.user, JSON.stringify(user));
    } else {
      localStorage.removeItem(storageKeys.user);
    }

    if (token) {
      localStorage.setItem(storageKeys.token, token);
    } else {
      localStorage.removeItem(storageKeys.token);
    }
  }, [token, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    login: async (email: string, _password: string) => {
      const role = detectRole(email);
      const nextUser: User = {
        name: email.split('@')[0].replace(/[._-]/g, ' '),
        email,
        role,
      };

      setUser(nextUser);
      setToken(`demo-token-${Date.now()}`);
    },
    logout: () => {
      setUser(null);
      setToken(null);
    },
    hasRole: (roles: Role[]) => Boolean(user && roles.includes(user.role)),
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}