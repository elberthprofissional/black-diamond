import { useState, useMemo, useEffect } from 'react';
import { getClientMilestonesPublic } from '../lib/api/loyalty';
import type { MilestoneProgress } from '../types';

/**
 * Hook para gerenciar progresso de fidelidade de um cliente durante o fluxo de agendamento.
 *
 * - Busca os milestones (metas de fidelidade) do cliente sempre que o `clientId` mudar.
 * - Se `clientId` for `null` (sem cliente selecionado), reseta o progresso.
 * - Expõe `nextMilestone`: a próxima meta não resgatada, ou `null` se nenhuma.
 *
 * @param clientId - ID do cliente ou `null` se nenhum cliente estiver selecionado
 */
export function useBookingLoyalty(clientId: string | null) {
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);

  useEffect(() => {
    const promise = clientId
      ? getClientMilestonesPublic(clientId)
      : Promise.resolve<MilestoneProgress[]>([]);

    promise.then(setMilestoneProgress).catch(() => setMilestoneProgress([]));
  }, [clientId]);

  const nextMilestone = useMemo(() => {
    if (!milestoneProgress || milestoneProgress.length === 0) return null;
    const unclaimed = milestoneProgress.filter((m) => !m.already_claimed);
    if (unclaimed.length === 0) return null;
    return unclaimed[0];
  }, [milestoneProgress]);

  return {
    milestoneProgress,
    nextMilestone,
  };
}
