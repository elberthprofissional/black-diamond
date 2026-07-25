import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

let globalStatus: ConnectionStatus = 'connected';
const listeners: Set<(s: ConnectionStatus) => void> = new Set();

// Singleton do heartbeat channel — evita canal duplicado
let heartbeatChannel: ReturnType<typeof supabase.channel> | null = null;

function notifyListeners(status: ConnectionStatus) {
  globalStatus = status;
  listeners.forEach((fn) => fn(status));
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listeners.add(setStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!navigator.onLine) {
      notifyListeners('disconnected');
      return;
    }
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      if (!mountedRef.current) return;
      notifyListeners(error ? 'disconnected' : 'connected');
    } catch {
      if (!mountedRef.current) return;
      notifyListeners('disconnected');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => checkConnection();
    const handleOffline = () => notifyListeners('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Só cria o heartbeat se ainda não existe — singleton real
    if (!heartbeatChannel) {
      heartbeatChannel = supabase.channel('connection-heartbeat');
      heartbeatChannel
        .on('system', { event: 'connected' }, () => {
          if (mountedRef.current) notifyListeners('connected');
        })
        .on('system', { event: 'disconnected' }, () => {
          if (mountedRef.current) notifyListeners('disconnected');
        })
        .subscribe((s) => {
          if (!mountedRef.current) return;
          if (s === 'SUBSCRIBED') notifyListeners('connected');
          else if (s === 'CHANNEL_ERROR') notifyListeners('disconnected');
        });
    }

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Não remove o canal no cleanup — é singleton global
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [checkConnection]);

  return { status, checkConnection };
}
