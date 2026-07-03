import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SETTINGS_KEYS = ['barber_name', 'barber_phone', 'barber_photo', 'barber_bio'] as const;

interface BarberSettingsContextType {
  barberName: string;
  barberPhone: string;
  barberPhoto: string;
  barberBio: string;
  loading: boolean;
  updateBarberName: (name: string) => Promise<boolean>;
  updateBarberPhone: (phone: string) => Promise<boolean>;
  updateBarberPhoto: (photoUrl: string) => Promise<boolean>;
  updateBarberBio: (bio: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const BarberSettingsContext = createContext<BarberSettingsContextType | null>(null);

export function BarberSettingsProvider({ children }: { children: React.ReactNode }) {
  const defaultPhone = import.meta.env.VITE_BARBER_WHATSAPP || '';

  const [barberName, setBarberName] = useState<string>(() => {
    return localStorage.getItem('barber_name') || 'Admin';
  });
  const [barberPhone, setBarberPhone] = useState<string>(() => {
    return localStorage.getItem('barber_phone') || defaultPhone;
  });
  const [barberPhoto, setBarberPhoto] = useState<string>(() => {
    return localStorage.getItem('barber_photo') || '';
  });
  const [barberBio, setBarberBio] = useState<string>(() => {
    return localStorage.getItem('barber_bio') || '';
  });
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
            localStorage.setItem('barber_name', row.value);
          }
          if (row.key === 'barber_phone') {
            const phone = row.value || defaultPhone;
            setBarberPhone(phone);
            localStorage.setItem('barber_phone', phone);
          }
          if (row.key === 'barber_photo') {
            setBarberPhoto(row.value || '');
            localStorage.setItem('barber_photo', row.value || '');
          }
          if (row.key === 'barber_bio') {
            setBarberBio(row.value || '');
            localStorage.setItem('barber_bio', row.value || '');
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
  }, [refetch]);

  const updateBarberName = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_name', value: trimmed }, { onConflict: 'key' });

    if (!error) {
      setBarberName(trimmed);
      localStorage.setItem('barber_name', trimmed);
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
      localStorage.setItem('barber_phone', digits);
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
      localStorage.setItem('barber_photo', photoUrl);
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
      localStorage.setItem('barber_bio', newBio);
      window.dispatchEvent(new CustomEvent('barber-settings-changed'));
      return true;
    }
    return false;
  }, []);

  return (
    <BarberSettingsContext.Provider value={{
      barberName,
      barberPhone,
      barberPhoto,
      barberBio,
      loading,
      updateBarberName,
      updateBarberPhone,
      updateBarberPhoto,
      updateBarberBio,
      refetch,
    }}>
      {children}
    </BarberSettingsContext.Provider>
  );
}

export function useBarberSettings() {
  const context = useContext(BarberSettingsContext);
  if (!context) {
    throw new Error('useBarberSettings must be used within a BarberSettingsProvider');
  }
  return context;
}
