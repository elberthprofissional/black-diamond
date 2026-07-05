import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: { id: string; email: string } | null;
  session: unknown;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setSession: (session: unknown) => void;
  setLoading: (loading: boolean) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  checkSession: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email || '' },
          session,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ user: null, session: null, isAuthenticated: false, loading: false });
      }
    } catch {
      set({ user: null, session: null, isAuthenticated: false, loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },
}));
