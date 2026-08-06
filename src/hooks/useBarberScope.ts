import { useMemo } from 'react';
import { useBarberContext } from '../contexts/BarberContext';

/**
 * Escopo de barbeiro no painel administrativo (multi-barbeiro).
 *
 * - Donos (is_owner — ex.: Tato) e o criador/suporte veem TUDO (scopedBarberId = null)
 * - Barbeiros comuns (ex.: o novo barbeiro contratado) veem apenas os PRÓPRIOS
 *   agendamentos (scopedBarberId = id do barbeiro vinculado ao usuário logado).
 *
 * O vínculo usuário ↔ barbeiro é a coluna `barbers.user_id` (auth.users).
 */
export function useBarberScope() {
  const { currentBarber } = useBarberContext();

  return useMemo(() => {
    const isOwner = currentBarber?.is_owner ?? false;
    const isScoped = !!currentBarber && !isOwner;
    return {
      /** ID do barbeiro para filtrar as consultas; null = ver todos. */
      scopedBarberId: isScoped ? currentBarber!.id : null,
      isScoped,
    };
  }, [currentBarber]);
}
