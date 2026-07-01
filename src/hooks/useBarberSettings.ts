import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useBarberSettings() {
  const defaultPhone = import.meta.env.VITE_BARBER_WHATSAPP || '';

  const [barberName, setBarberName] = useState<string>(() => {
    return localStorage.getItem('barber_name') || 'Admin';
  });
  const [barberPhone, setBarberPhone] = useState<string>(() => {
    return localStorage.getItem('barber_phone') || defaultPhone;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['barber_name', 'barber_phone']);

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
          }
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [defaultPhone]);

  const updateBarberName = useCallback(async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'barber_name', value: trimmed }, { onConflict: 'key' });

    if (!error) {
      setBarberName(trimmed);
      localStorage.setItem('barber_name', trimmed);
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
      return true;
    }
    return false;
  }, []);

  return { barberName, barberPhone, loading, updateBarberName, updateBarberPhone };
}
