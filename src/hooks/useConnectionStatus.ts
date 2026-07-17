import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

const CHECK_INTERVAL = 60000;

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
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (error) {
        notifyListeners('disconnected');
      } else {
        notifyListeners('connected');
      }
    } catch (e) {
      logError(e);
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

    const channel = supabase.channel('connection-heartbeat');
    channel
      .on('system', { event: 'connected' }, () => {
        if (!mountedRef.current) return;
        notifyListeners('connected');
      })
      .on('system', { event: 'disconnected' }, () => {
        if (!mountedRef.current) return;
        notifyListeners('disconnected');
      })
      .subscribe((s) => {
        if (!mountedRef.current) return;
        if (s === 'SUBSCRIBED') {
          notifyListeners('connected');
        } else if (s === 'CHANNEL_ERROR') {
          notifyListeners('disconnected');
        }
      });

    channelRef.current = channel;

    const startHeartbeat = () => {
      heartbeatRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        await checkConnection();
        startHeartbeat();
      }, CHECK_INTERVAL);
    };
    startHeartbeat();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatRef.current) {
        clearTimeout(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [checkConnection]);

  return { status, checkConnection };
}
