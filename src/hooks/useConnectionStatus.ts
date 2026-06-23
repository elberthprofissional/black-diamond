import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

let globalStatus: ConnectionStatus = 'connected';
const listeners: Set<(s: ConnectionStatus) => void> = new Set();

function notifyListeners(status: ConnectionStatus) {
  globalStatus = status;
  listeners.forEach(fn => fn(status));
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);

  useEffect(() => {
    listeners.add(setStatus);
    return () => { listeners.delete(setStatus); };
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      notifyListeners(error ? 'disconnected' : 'connected');
    } catch {
      notifyListeners('disconnected');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { status, checkConnection };
}
