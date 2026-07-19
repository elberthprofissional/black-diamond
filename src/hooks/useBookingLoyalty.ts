import { useState, useMemo, useEffect } from 'react';
import { getClientMilestonesPublic } from '../lib/api/loyalty';
import type { MilestoneProgress } from '../types';

export function useBookingLoyalty(clientId: string | null) {
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);

  useEffect(() => {
    if (clientId) {
      getClientMilestonesPublic(clientId)
        .then(setMilestoneProgress)
        .catch(() => setMilestoneProgress([]));
    } else {
      setMilestoneProgress([]);
    }
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
