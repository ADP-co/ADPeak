import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AUTH_INVALIDATED_EVENT, AUTH_STORAGE_KEY } from '../api/client';

export interface User {
  id: string;
  username?: string;
  name: string;
  role: string;
  description: string;
  sessionToken?: string;
  plantelId?: number;
  responsableId?: number;
}

export interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const LAST_ACTIVITY_STORAGE_KEY = 'adpeak.session.lastActivity';
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const parsedUser = storedUser ? JSON.parse(storedUser) as User : null;

      if (parsedUser && (!parsedUser.sessionToken || isExpiredToken(parsedUser.sessionToken))) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
        return null;
      }

      return parsedUser;
    } catch {
      return null;
    }
  });

  const login = useCallback((userData: User) => {
    setUser(userData);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const handleInvalidatedSession = () => logout();
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleInvalidatedSession);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleInvalidatedSession);
  }, [logout]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(event.newValue) as User;
        setUser(parsedUser.sessionToken && !isExpiredToken(parsedUser.sessionToken) ? parsedUser : null);
      } catch {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let timeoutId = 0;
    const scheduleTimeout = () => {
      window.clearTimeout(timeoutId);
      const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY)) || Date.now();
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity));
      timeoutId = window.setTimeout(logout, remaining);
    };
    const recordActivity = () => {
      window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
      scheduleTimeout();
    };
    const handleActivityStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY && event.newValue) {
        scheduleTimeout();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener('storage', handleActivityStorage);
    scheduleTimeout();

    return () => {
      window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener('storage', handleActivityStorage);
    };
  }, [logout, user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

function isExpiredToken(token: string) {
  try {
    const encodedPayload = token.split('.')[0];
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: unknown };
    return !Number.isInteger(payload.exp) || Number(payload.exp) <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
