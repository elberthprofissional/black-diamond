import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook genérico para gerenciar uma configuração individual na tabela `settings`.
 *
 * Reduz drasticamente o boilerplate repetitivo de upsert + setState
 * que existe em BarberSettingsContext.
 *
 * @param key - Chave da configuração na tabela `settings`
 * @param defaultValue - Valor padrão enquanto não carregado
 *
 * @returns {{ value, loading, update, setValue }}
 *
 * @example
 * const { value: barberName, update: updateBarberName } = useSetting('barber_name', 'Admin');
 * // updateBarberName('Novo Nome') → upsert no Supabase + atualiza estado local
 */
export function useSetting(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);

  const update = useCallback(
    async (newValue: string): Promise<boolean> => {
      setLoading(true);
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value: newValue }, { onConflict: 'key' });

      if (!error) {
        setValue(newValue);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    },
    [key]
  );

  return { value, setValue, loading, update } as const;
}
