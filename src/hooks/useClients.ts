import { useState, useEffect } from 'react';
import { useClientsData } from './useClientsData';
import { useClientPanel } from './useClientPanel';
import { useClientCreation } from './useClientCreation';
import { getMensalistaPlans } from '../lib/api';
import type { MensalistaPlan } from '../types';

export function useClients() {
  const data = useClientsData();
  const [plans, setPlans] = useState<MensalistaPlan[]>([]);

  useEffect(() => {
    getMensalistaPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  const panel = useClientPanel(data.setClients, plans);
  const creation = useClientCreation(data.loadData);

  return {
    // Data
    ...data,

    // Panel
    ...panel,
    plans,

    // Creation
    ...creation,
  };
}
