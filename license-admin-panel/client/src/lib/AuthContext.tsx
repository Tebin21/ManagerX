import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

interface AuthState {
  status: 'checking' | 'authed' | 'unauthed';
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('checking');

  useEffect(() => {
    api
      .checkSession()
      .then(() => setStatus('authed'))
      .catch(() => setStatus('unauthed'));
  }, []);

  async function login(password: string) {
    await api.login(password);
    setStatus('authed');
  }

  async function logout() {
    await api.logout();
    setStatus('unauthed');
  }

  return <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
