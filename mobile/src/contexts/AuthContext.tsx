import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  tenant_id: number;
}

interface AuthContextValue {
  isSignedIn: boolean;
  isLoading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodePayload(token: string): User | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      tenant_id: decoded.tenant_id,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('auth_token').then((token) => {
      if (token) setUser(decodePayload(token));
      setIsLoading(false);
    });
  }, []);

  async function signIn(email: string, password: string) {
    const data = await api.request<{ access_token: string; user: User }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    await SecureStore.setItemAsync('auth_token', data.access_token);
    setUser(data.user);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ isSignedIn: !!user, isLoading, user, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
