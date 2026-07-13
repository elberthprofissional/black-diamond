import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface NotificationPrefs {
  inApp: boolean;
  sound: boolean;
  preview: boolean;
  badge: boolean;
}

const STORAGE_KEY = 'notification_preferences';
const DEFAULTS: NotificationPrefs = {
  inApp: true,
  sound: true,
  preview: true,
  badge: true,
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const prefsRef = useRef<NotificationPrefs>(DEFAULTS);

  // Keep ref in sync
  prefsRef.current = prefs;

  const fetchPrefs = useCallback(async () => {
    try {
      if (!supabase?.auth?.getUser) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', STORAGE_KEY)
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setPrefs({ ...DEFAULTS, ...parsed });
        } catch {
          // Invalid JSON — keep defaults
        }
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePref = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    // Optimistic update
    const snapshot = prefsRef.current;
    const updated = { ...snapshot, [key]: value };
    setPrefs(updated);

    const { error } = await supabase
      .from('settings')
      .upsert({ key: STORAGE_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });

    if (error) {
      // Rollback on error
      setPrefs(snapshot);
      return false;
    }
    return true;
  }, []);

  const resetPrefs = useCallback(async () => {
    setPrefs(DEFAULTS);
    prefsRef.current = DEFAULTS;
    const { error } = await supabase
      .from('settings')
      .upsert({ key: STORAGE_KEY, value: JSON.stringify(DEFAULTS) }, { onConflict: 'key' });
    return !error;
  }, []);

  return {
    prefs,
    loading,
    updatePref,
    resetPrefs,
    refetch: fetchPrefs,
  };
}
