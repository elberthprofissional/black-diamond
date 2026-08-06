import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClients } from '../lib/api';
import { getMensalistaPlans } from '../lib/api/settings';
import { useToast } from './useToast';
import { BLOCKED_NAME, BLOCKED_PHONE, INACTIVE_DAYS } from '../lib/constants';
import { getLocalDateString } from '../lib/utils';
import type { Client, ClientWithStats } from '../types';

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export const clientsQueryKey = ['clients'] as const;
export const mensalistaPlansQueryKey = ['mensalistaPlans'] as const;

function enrichClients(clientsData: Client[]): ClientWithStats[] {
  return (clientsData || [])
    .filter(
      (c: Client) =>
        c &&
        c.name &&
        !c.deleted_at &&
        c.name !== BLOCKED_NAME &&
        c.phone !== BLOCKED_PHONE &&
        !c.is_blocked
    )
    .map((c: Client) => {
      const lastVisitDate = c.last_visit_date ? new Date(c.last_visit_date + 'T00:00:00') : null;
      const bookingsCount = c.historical_visits || 0;
      const totalSpent = Number(c.historical_spent || 0);
      const isInactive = lastVisitDate
        ? daysSince(getLocalDateString(lastVisitDate)) > INACTIVE_DAYS
        : bookingsCount === 0;

      return {
        ...c,
        lastVisit: lastVisitDate ? lastVisitDate.toLocaleDateString('pt-BR') : 'Nunca',
        lastVisitDate,
        totalSpent,
        bookingsCount,
        upcomingBooking: null,
        isInactive,
      };
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Hook para carregar dados de clientes via React Query.
 *
 * - Busca clientes + planos em paralelo
 * - Enriquece dados (stats, inatividade, etc)
 * - Refetch a cada 5 min + ao focar a janela
 * - Busca com debounce via useDeferredValue
 */
export function useClientsData() {
  const { showError } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDeferredValue(searchTerm);
  const loadErrorShown = useRef(false);

  // Busca clientes
  const clientsQuery = useQuery({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      const data = await getClients();
      return enrichClients(data);
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000, // auto-refresh a cada 5 min
  });

  // Busca planos
  const plansQuery = useQuery({
    queryKey: mensalistaPlansQueryKey,
    queryFn: getMensalistaPlans,
    staleTime: 10 * 60 * 1000,
  });

  // Mostra toast de erro apenas uma vez
  useEffect(() => {
    if (clientsQuery.error && !loadErrorShown.current) {
      loadErrorShown.current = true;
      showError('Erro ao carregar dados.');
    }
    if (clientsQuery.data) {
      loadErrorShown.current = false;
    }
  }, [clientsQuery.error, clientsQuery.data, showError]);

  // Refresh ao focar a janela (visibilidade)
  useEffect(() => {
    let lastFetch = 0;
    const handleRefresh = () => {
      const now = Date.now();
      if (now - lastFetch < 2000) return;
      lastFetch = now;
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
    };
    document.addEventListener('visibilitychange', handleRefresh);
    return () => document.removeEventListener('visibilitychange', handleRefresh);
  }, [queryClient]);

  // Filtro local por searchTerm
  const clients = useMemo(() => {
    const all = clientsQuery.data ?? [];
    if (!debouncedSearch.trim()) return all;
    const term = debouncedSearch.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
    );
  }, [clientsQuery.data, debouncedSearch]);

  // Função para atualizar o cache (ex: após mutações)
  const setClients = useCallback(
    (updater: ClientWithStats[] | ((prev: ClientWithStats[]) => ClientWithStats[])) => {
      queryClient.setQueryData<ClientWithStats[]>(clientsQueryKey, (prev) => {
        const current = prev ?? [];
        return typeof updater === 'function' ? updater(current) : updater;
      });
    },
    [queryClient]
  );

  return {
    clients,
    setClients,
    plans: plansQuery.data ?? [],
    loading: clientsQuery.isLoading || plansQuery.isLoading,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    loadData: () => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
      queryClient.invalidateQueries({ queryKey: mensalistaPlansQueryKey });
    },
  };
}
