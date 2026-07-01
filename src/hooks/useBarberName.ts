import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useBarberName() {
  const [barberName, setBarberName] = useState<string>(() => {
    return localStorage.getItem('barber_name') || 'Admin';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'barber_name')
          .single();

        if (data?.value) {
          setBarberName(data.value);
          localStorage.setItem('barber_name', data.value);
        }
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    };

    fetchName();
  }, []);

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

  return { barberName, loading, updateBarberName };
}
