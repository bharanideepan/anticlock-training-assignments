import { create } from 'zustand';
import type { User } from '../types/api.types';
import { setAccessToken } from '../../api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: (token, user) => {
    setAccessToken(token);
    set({ accessToken: token, user, isAuthenticated: true });
  },
  logout: () => {
    setAccessToken(null);
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
  setUser: (user) => set({ user }),
}));
