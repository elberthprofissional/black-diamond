import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

const INITIAL_INTERVAL = 30000;
const MAX_INTERVAL = 300000;
const BACKOFF_MULTIPLIER = 2;

interface ConnectionState {
  status: ConnectionStatus;
  interval: number;
  setStatus: (status: ConnectionStatus) => void;
  checkConnection: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

let timeoutId: ReturnType<typeof setTimeout> | null = null;

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'connected',
  interval: INITIAL_INTERVAL,

  setStatus: (status) => set({ status }),

  checkConnection: async () => {
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      if (error) {
        set((state) => ({
          status: 'disconnected',
          interval: Math.min(state.interval * BACKOFF_MULTIPLIER, MAX_INTERVAL),
        }));
      } else {
        set({ status: 'connected', interval: INITIAL_INTERVAL });
      }
    } catch {
      set((state) => ({
        status: 'disconnected',
        interval: Math.min(state.interval * BACKOFF_MULTIPLIER, MAX_INTERVAL),
      }));
    }
  },

  startMonitoring: () => {
    if (timeoutId) return;

    const schedule = () => {
      timeoutId = setTimeout(async () => {
        await get().checkConnection();
        schedule();
      }, get().interval);
    };

    get().checkConnection();
    schedule();
  },

  stopMonitoring: () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  },
}));
