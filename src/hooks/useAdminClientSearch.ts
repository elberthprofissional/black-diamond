import { useState, useEffect, useRef, useCallback } from 'react';
import { getClients, getClientByPhone, getMensalistaPlans } from '../lib/api';
import { supabase } from '../lib/supabase';
import { formatPhone, maskName, maskPhone } from '../lib/utils';
import { useToast } from './useToast';
import { BLOCKED_NAME, MASK_SENSITIVE_DATA } from '../lib/constants';
import type { Client, MensalistaPlan } from '../types';

/** Busca counts de no_show + limite configurado */
async function getNoShowBlockedInfo(): Promise<{
  noShowCounts: Map<string, number>;
  maxNoShows: number;
}> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const [bookingsRes, settingsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('client_id')
        .eq('no_show', true)
        .gte('booking_date', cutoffStr),
      supabase.from('settings').select('value').eq('key', 'max_no_shows').maybeSingle(),
    ]);

    const maxNoShows = settingsRes.data?.value ? parseInt(settingsRes.data.value, 10) : 3;
    const noShowCounts = new Map<string, number>();
    if (bookingsRes.data) {
      for (const row of bookingsRes.data) {
        if (row.client_id) {
          noShowCounts.set(row.client_id, (noShowCounts.get(row.client_id) || 0) + 1);
        }
      }
    }
    return { noShowCounts, maxNoShows };
  } catch {
    return { noShowCounts: new Map(), maxNoShows: 3 };
  }
}

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
  filteredClientsForModal: Client[];
  setFilteredClientsForModal: React.Dispatch<React.SetStateAction<Client[]>>;
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
  const [filteredClientsForModal, setFilteredClientsForModal] = useState<Client[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load mensalista plans
  useEffect(() => {
    getMensalistaPlans(true)
      .then(setAllPlans)
      .catch(() => {});
  }, []);

  // Detect mensalista when typing phone manually
  useEffect(() => {
    if (!isManualEntry) return;

    const digits = newClient.phone.replace(/\D/g, '');
    if (digits.length < 11) {
      if (isMensalista) setIsMensalista(false);
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

  // Load clients for modal (com status de bloqueio por falta)
  const loadClients = useCallback(async () => {
    try {
      const [clientsData, { noShowCounts, maxNoShows }] = await Promise.all([
        getClients(),
        getNoShowBlockedInfo(),
      ]);
      const enrichedClients = clientsData
        .filter((c: Client) => {
          return c && c.name && !c.deleted_at && c.name !== BLOCKED_NAME && !c.is_blocked;
        })
        .map((c: Client) => ({
          ...c,
          _originalName: c.name,
          _originalPhone: c.phone,
          name: MASK_SENSITIVE_DATA ? maskName(c.name) : c.name,
          phone: MASK_SENSITIVE_DATA ? maskPhone(c.phone) : c.phone,
          _isNoShowBlocked: (noShowCounts.get(c.id) || 0) >= maxNoShows,
        }));
      setFilteredClientsForModal(enrichedClients);
      return enrichedClients;
    } catch {
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
            ((c as any)._originalPhone || c.phone)
              .replace(/\D/g, '')
              .includes(term.replace(/\D/g, ''))
          )
        : filteredClientsForModal.filter((c) =>
            ((c as any)._originalName || c.name).toLowerCase().includes(term)
          );

      setIsSearchingClient(false);

      if (matches.length === 1) {
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
