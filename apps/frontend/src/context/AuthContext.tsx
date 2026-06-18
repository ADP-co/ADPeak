import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AUTH_STORAGE_KEY } from '../api/client';

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
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const parsedUser = storedUser ? JSON.parse(storedUser) as User : null;

      if (parsedUser && !parsedUser.sessionToken) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

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
        setUser(parsedUser.sessionToken ? parsedUser : null);
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

    let timeoutId = window.setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    return () => {
      window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [logout, user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
