import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

const INITIAL_INTERVAL = 30000;
const MAX_INTERVAL = 300000;
const BACKOFF_MULTIPLIER = 2;

let globalStatus: ConnectionStatus = 'connected';
const listeners: Set<(s: ConnectionStatus) => void> = new Set();

function notifyListeners(status: ConnectionStatus) {
  globalStatus = status;
  listeners.forEach(fn => fn(status));
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);
  const intervalRef = useRef(INITIAL_INTERVAL);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listeners.add(setStatus);
    return () => { listeners.delete(setStatus); };
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      if (error) {
        notifyListeners('disconnected');
        intervalRef.current = Math.min(intervalRef.current * BACKOFF_MULTIPLIER, MAX_INTERVAL);
      } else {
        notifyListeners('connected');
        intervalRef.current = INITIAL_INTERVAL;
      }
    } catch {
      notifyListeners('disconnected');
      intervalRef.current = Math.min(intervalRef.current * BACKOFF_MULTIPLIER, MAX_INTERVAL);
    }
  }, []);

  useEffect(() => {
    const scheduleNext = () => {
      timeoutRef.current = setTimeout(async () => {
        await checkConnection();
        scheduleNext();
      }, intervalRef.current);
    };

    checkConnection();
    scheduleNext();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkConnection]);

  return { status, checkConnection };
}
