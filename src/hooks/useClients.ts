import { useClientsData } from './useClientsData';
import { useClientPanel } from './useClientPanel';
import { useClientCreation } from './useClientCreation';

export function useClients() {
  const data = useClientsData();
  const panel = useClientPanel(data.setClients, data.plans);
  const loadDataAsync: () => Promise<void> = () => {
    data.loadData();
    return Promise.resolve();
  };
  const creation = useClientCreation(loadDataAsync);

  return {
    // Data
    ...data,

    // Panel
    ...panel,

    // Creation
    ...creation,
  };
}
