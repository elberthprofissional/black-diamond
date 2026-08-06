import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '../lib/logger';
import { getSetting, upsertSetting } from '../lib/api/settings';

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

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const fetchPrefs = useCallback(async () => {
    try {
      const val = await getSetting(STORAGE_KEY);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setPrefs({ ...DEFAULTS, ...parsed });
        } catch (e) {
          logError(e);
        }
      }
    } catch (e) {
      logError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePref = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    const snapshot = prefsRef.current;
    const updated = { ...snapshot, [key]: value };
    setPrefs(updated);

    try {
      await upsertSetting(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch {
      setPrefs(snapshot);
      return false;
    }
  }, []);

  const resetPrefs = useCallback(async () => {
    setPrefs(DEFAULTS);
    prefsRef.current = DEFAULTS;
    try {
      await upsertSetting(STORAGE_KEY, JSON.stringify(DEFAULTS));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    prefs,
    loading,
    updatePref,
    resetPrefs,
    refetch: fetchPrefs,
  };
}
