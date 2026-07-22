import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getBarbers, getBarberByUserId } from '../lib/api/barbers';
import { logError } from '../lib/logger';
import type { Barber } from '../types';

interface BarberContextValue {
  barbers: Barber[];
  currentBarber: Barber | null;
  isOwner: boolean;
  loading: boolean;
  refreshBarbers: () => Promise<void>;
}

const BarberContext = createContext<BarberContextValue | null>(null);

export function BarberProvider({ children }: { children: ReactNode }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [currentBarber, setCurrentBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBarbers = async () => {
    try {
      const data = await getBarbers();
      setBarbers(data);
    } catch (e) {
      logError(e, 'BarberContext');
    }
  };

  const loadCurrentBarber = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setCurrentBarber(null);
        return;
      }
      const barber = await getBarberByUserId(session.user.id);
      setCurrentBarber(barber);
    } catch (e) {
      logError(e, 'BarberContext');
    }
  };

  const refresh = async () => {
    await Promise.all([loadBarbers(), loadCurrentBarber()]);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BarberContext.Provider
      value={{
        barbers,
        currentBarber,
        isOwner: currentBarber?.is_owner ?? false,
        loading,
        refreshBarbers: refresh,
      }}
    >
      {children}
    </BarberContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBarberContext() {
  const ctx = useContext(BarberContext);
  if (!ctx) throw new Error('useBarberContext must be used within BarberProvider');
  return ctx;
}
