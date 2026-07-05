import { useClientsData } from './useClientsData';
import { useClientPanel } from './useClientPanel';
import { useClientCreation } from './useClientCreation';

export function useClients() {
  const data = useClientsData();
  const panel = useClientPanel(data.setClients);
  const creation = useClientCreation(data.loadData);

  return {
    // Data
    ...data,

    // Panel
    ...panel,

    // Creation
    ...creation,
  };
}
