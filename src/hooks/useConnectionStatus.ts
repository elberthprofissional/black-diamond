import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

let globalStatus: ConnectionStatus = 'connected';
const listeners: Set<(s: ConnectionStatus) => void> = new Set();

function notifyListeners(status: ConnectionStatus) {
  globalStatus = status;
  listeners.forEach((fn) => fn(status));
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

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

    // Supabase channel heartbeat — most reliable connection indicator
    const channel = supabase.channel('connection-heartbeat');
    channel
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

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [checkConnection]);

  return { status, checkConnection };
}
