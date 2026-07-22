import { useState, useEffect, useRef, useCallback } from 'react';
import { getClients, getClientByPhone, getMensalistaPlans } from '../lib/api';
import { formatPhone } from '../lib/utils';
import { useToast } from './useToast';
import { BLOCKED_NAME } from '../lib/constants';
import type { Client, MensalistaPlan } from '../types';
import { logError } from '../lib/logger';

/** Client enriched for modal display */
type ClientWithEnriched = Client;

interface UseAdminClientSearchReturn {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  multipleMatches: Client[];
  setMultipleMatches: React.Dispatch<React.SetStateAction<Client[]>>;
  isSearchingClient: boolean;
  selectedClient: Client | null;
  setSelectedClient: React.Dispatch<React.SetStateAction<Client | null>>;
  newClient: { name: string; phone: string };
  setNewClient: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  isManualEntry: boolean;
  setIsManualEntry: React.Dispatch<React.SetStateAction<boolean>>;
  isMensalista: boolean;
  setIsMensalista: React.Dispatch<React.SetStateAction<boolean>>;
  currentPlan: MensalistaPlan | null;
  setCurrentPlan: React.Dispatch<React.SetStateAction<MensalistaPlan | null>>;
  allPlans: MensalistaPlan[];
  filteredClientsForModal: ClientWithEnriched[];
  setFilteredClientsForModal: React.Dispatch<React.SetStateAction<ClientWithEnriched[]>>;
  handleSearch: () => void;
  selectClient: (client: Client) => void;
  loadClients: () => Promise<Client[]>;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAdminClientSearch(): UseAdminClientSearchReturn {
  const { showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [multipleMatches, setMultipleMatches] = useState<Client[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '' });
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [isMensalista, setIsMensalista] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<MensalistaPlan | null>(null);
  const [allPlans, setAllPlans] = useState<MensalistaPlan[]>([]);
  const [filteredClientsForModal, setFilteredClientsForModal] = useState<ClientWithEnriched[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load mensalista plans
  useEffect(() => {
    getMensalistaPlans(true)
      .then(setAllPlans)
      .catch((e) => logError(e, 'useAdminClientSearch'));
  }, []);

  // Detect mensalista when typing phone manually
  useEffect(() => {
    if (!isManualEntry) return;

    const digits = newClient.phone.replace(/\D/g, '');
    if (digits.length < 11) {
      if (isMensalista) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMensalista(false);
      }
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      getClientByPhone(digits)
        .then((client) => {
          if (cancelled) return;
          if (client) {
            setIsMensalista(!!client.is_mensalista);
            setCurrentPlan(
              client.is_mensalista && client.mensalista_plan_id
                ? allPlans.find((p) => p.id === client.mensalista_plan_id) || null
                : null
            );
            setNewClient((prev) => {
              if (client.name && !prev.name) {
                return { ...prev, name: client.name };
              }
              return prev;
            });
          } else {
            setIsMensalista(false);
            setCurrentPlan(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsMensalista(false);
            setCurrentPlan(null);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newClient.phone, isManualEntry, allPlans, isMensalista]);

  // Load clients for modal
  const loadClients = useCallback(async () => {
    try {
      const clientsData = await getClients();
      const enrichedClients = clientsData
        .filter((c: Client) => {
          return c && c.name && !c.deleted_at && c.name !== BLOCKED_NAME && !c.is_blocked;
        })
        .map((c: Client) => c);
      setFilteredClientsForModal(enrichedClients);
      return enrichedClients;
    } catch (e) {
      logError(e);
      showError('Erro ao carregar clientes.');
      return [];
    }
  }, [showError]);

  // Select a matched client (from search results or modal)
  const selectClient = useCallback(
    (client: Client) => {
      setSelectedClient(client);
      setMultipleMatches([]);
      setIsManualEntry(false);
      setIsMensalista(!!client.is_mensalista);
      setCurrentPlan(
        client.is_mensalista && client.mensalista_plan_id
          ? allPlans.find((p) => p.id === client.mensalista_plan_id) || null
          : null
      );
    },
    [allPlans]
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      showError('Digite um WhatsApp ou Nome.');
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    setIsSearchingClient(true);

    searchTimeoutRef.current = setTimeout(() => {
      const term = searchQuery.trim().toLowerCase();
      const isPhone = /^\+?\d[\d\s\-()]*$/.test(term);
      const matches = isPhone
        ? filteredClientsForModal.filter((c) =>
            c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
          )
        : filteredClientsForModal.filter((c) => c.name.toLowerCase().includes(term));

      setIsSearchingClient(false);

      if (matches.length === 1 && matches[0]) {
        selectClient(matches[0]);
      } else if (matches.length > 1) {
        setSelectedClient(null);
        setMultipleMatches(matches);
        setIsManualEntry(false);
      } else {
        setSelectedClient(null);
        setMultipleMatches([]);
        setIsMensalista(false);
        const prefilledPhone = isPhone ? formatPhone(term) : '';
        setNewClient({ name: '', phone: prefilledPhone });
        setIsManualEntry(true);
        showError('Cliente não encontrado. Preencha o nome.');
      }
    }, 400);
  }, [searchQuery, filteredClientsForModal, selectClient, showError]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return {
    // Client search state
    searchQuery,
    setSearchQuery,
    multipleMatches,
    setMultipleMatches,
    isSearchingClient,
    selectedClient,
    setSelectedClient,
    newClient,
    setNewClient,
    isManualEntry,
    setIsManualEntry,
    isMensalista,
    setIsMensalista,
    currentPlan,
    setCurrentPlan,
    allPlans,
    filteredClientsForModal,
    setFilteredClientsForModal,

    // Actions
    handleSearch,
    selectClient,
    loadClients,

    // Search modal
    isSearchOpen,
    setIsSearchOpen,
  };
}
