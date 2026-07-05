import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SETTINGS_KEYS = [
  'barber_name',
  'barber_phone',
  'barber_photo',
  'barber_bio',
  'barber_quote',
  'barber_instagram',
  'barber_hours',
] as const;

interface BarberSettingsContextType {
  barberName: string;
  barberPhone: string;
  barberPhoto: string;
  barberBio: string;
  barberQuote: string;
  barberInstagram: string;
  barberHours: string;
  loading: boolean;
  updateBarberName: (name: string) => Promise<boolean>;
  updateBarberPhone: (phone: string) => Promise<boolean>;
  updateBarberPhoto: (photoUrl: string) => Promise<boolean>;
  updateBarberBio: (bio: string) => Promise<boolean>;
  updateBarberQuote: (quote: string) => Promise<boolean>;
  updateBarberInstagram: (instagram: string) => Promise<boolean>;
  updateBarberHours: (hours: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const BarberSettingsContext = createContext<BarberSettingsContextType | null>(null);

export function BarberSettingsProvider({ children }: { children: React.ReactNode }) {
  const defaultPhone = import.meta.env.VITE_BARBER_WHATSAPP || '';

  const [barberName, setBarberName] = useState<string>('Admin');
  const [barberPhone, setBarberPhone] = useState<string>(defaultPhone);
  const [barberPhoto, setBarberPhoto] = useState<string>('');
  const [barberBio, setBarberBio] = useState<string>('');
  const [barberQuote, setBarberQuote] = useState<string>('');
  const [barberInstagram, setBarberInstagram] = useState<string>('');
  const [barberHours, setBarberHours] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [...SETTINGS_KEYS]);

      if (data) {
        for (const row of data) {
          if (row.key === 'barber_name' && row.value) {
            setBarberName(row.value);
          }
          if (row.key === 'barber_phone') {
            setBarberPhone(row.value || defaultPhone);
          }
          if (row.key === 'barber_photo') {
            setBarberPhoto(row.value || '');
          }
          if (row.key === 'barber_bio') {
            setBarberBio(row.value || '');
          }
          if (row.key === 'barber_quote') {
            setBarberQuote(row.value || '');
          }
          if (row.key === 'barber_instagram') {
            setBarberInstagram(row.value || '');
          }
          if (row.key === 'barber_hours') {
            setBarberHours(row.value || '');
          }
        }
      }
    } catch {
      // keep current values
    } finally {
      setLoading(false);
    }
  }, [defaultPhone]);

  useEffect(() => {
    refetch();

    // Re-fetch sempre que alguém salvar configurações
    const handleSettingsChanged = () => {
      refetch();
    };
    window.addEventListener('barber-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('barber-settings-changed', handleSettingsChanged);
  }, [refetch]);

  const updateBarberName = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_name', value: trimmed }, { onConflict: 'key' });
    if (!error) {
      setBarberName(trimmed);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberPhone = useCallback(async (newPhone: string) => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10) return false;
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_phone', value: digits }, { onConflict: 'key' });
    if (!error) {
      setBarberPhone(digits);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberPhoto = useCallback(async (photoUrl: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_photo', value: photoUrl }, { onConflict: 'key' });
    if (!error) {
      setBarberPhoto(photoUrl);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberBio = useCallback(async (newBio: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_bio', value: newBio }, { onConflict: 'key' });
    if (!error) {
      setBarberBio(newBio);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberQuote = useCallback(async (newQuote: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_quote', value: newQuote }, { onConflict: 'key' });
    if (!error) {
      setBarberQuote(newQuote);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberInstagram = useCallback(async (newInstagram: string) => {
    const cleaned = newInstagram.replace(/^@/, '').trim();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_instagram', value: cleaned }, { onConflict: 'key' });
    if (!error) {
      setBarberInstagram(cleaned);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  const updateBarberHours = useCallback(async (newHours: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_hours', value: newHours }, { onConflict: 'key' });

    if (error) return false;

    try {
      const parsed = JSON.parse(newHours);
      const enabledDays: string[] = [];
      const openTimes: string[] = [];
      const closeTimes: string[] = [];

      for (const [day, schedule] of Object.entries(parsed)) {
        if ((schedule as { enabled: boolean }).enabled) {
          enabledDays.push(day);
          openTimes.push((schedule as { open: string }).open);
          closeTimes.push((schedule as { close: string }).close);
        }
      }

      const earliestOpen = openTimes.sort()[0] || '08:00';
      const latestClose = closeTimes.sort().reverse()[0] || '18:00';
      const sat = parsed['6'] as { enabled: boolean; open: string; close: string } | undefined;

      await Promise.allSettled([
        supabase
          .from('settings')
          .upsert({ key: 'opening_time', value: earliestOpen }, { onConflict: 'key' }),
        supabase
          .from('settings')
          .upsert({ key: 'closing_time', value: latestClose }, { onConflict: 'key' }),
        supabase
          .from('settings')
          .upsert({ key: 'working_days', value: enabledDays.join(',') }, { onConflict: 'key' }),
        supabase
          .from('settings')
          .upsert({ key: 'saturday_opening', value: sat?.open || '08:00' }, { onConflict: 'key' }),
        supabase
          .from('settings')
          .upsert({ key: 'saturday_closing', value: sat?.close || '18:00' }, { onConflict: 'key' }),
      ]);
    } catch {
      // legacy keys fallback failed — barber_hours JSON is already saved
    }

    setBarberHours(newHours);
    try {
      localStorage.setItem('barber_hours', newHours);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('barber-settings-changed'));
    return true;
  }, []);

  return (
    <BarberSettingsContext.Provider
      value={{
        barberName,
        barberPhone,
        barberPhoto,
        barberBio,
        barberQuote,
        barberInstagram,
        barberHours,
        loading,
        updateBarberName,
        updateBarberPhone,
        updateBarberPhoto,
        updateBarberBio,
        updateBarberQuote,
        updateBarberInstagram,
        updateBarberHours,
        refetch,
      }}
    >
      {children}
    </BarberSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBarberSettings() {
  const context = useContext(BarberSettingsContext);
  if (!context) {
    throw new Error('useBarberSettings must be used within a BarberSettingsProvider');
  }
  return context;
}
