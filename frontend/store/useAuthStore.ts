import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      login: (token, user) => {
        set({
          token,
          user,
          isAuthenticated: true
        });
      },
      logout: () => {
        set(initialState);
      }
    }),
    {
      name: 'pos-auth-storage'
    }
  )
);

