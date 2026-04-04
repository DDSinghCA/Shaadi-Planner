import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../utils/api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'contributor' | 'viewer';
  force_password_change: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('Not implemented'); },
  logout: async () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActiveRef = useRef(Date.now());

  // Check stored session on mount
  useEffect(() => {
    (async () => {
      try {
        await api.init();
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          // Verify token still valid
          try {
            const res = await api.get('/auth/me');
            setUser(res.user);
          } catch {
            await api.clearTokens();
          }
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-logout on inactivity
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        if (Date.now() - lastActiveRef.current > INACTIVITY_TIMEOUT && user) {
          logout();
        }
        lastActiveRef.current = Date.now();
      } else if (state === 'background') {
        lastActiveRef.current = Date.now();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post('/auth/login', { username, password });
    await api.setTokens(data.access_token, data.refresh_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.clearTokens();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
    AsyncStorage.setItem('user_data', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
