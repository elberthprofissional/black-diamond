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
  listeners.forEach((fn) => fn(status));
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);
  const intervalRef = useRef(INITIAL_INTERVAL);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    listeners.add(setStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      if (!mountedRef.current) return;
      if (error) {
        notifyListeners('disconnected');
        intervalRef.current = Math.min(intervalRef.current * BACKOFF_MULTIPLIER, MAX_INTERVAL);
      } else {
        notifyListeners('connected');
        intervalRef.current = INITIAL_INTERVAL;
      }
    } catch {
      if (!mountedRef.current) return;
      notifyListeners('disconnected');
      intervalRef.current = Math.min(intervalRef.current * BACKOFF_MULTIPLIER, MAX_INTERVAL);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const scheduleNext = () => {
      if (!mountedRef.current) return;
      timeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        await checkConnection();
        scheduleNext();
      }, intervalRef.current);
    };

    checkConnection();
    scheduleNext();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [checkConnection]);

  return { status, checkConnection };
}
