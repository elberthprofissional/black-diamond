import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { logError } from '../lib/logger';
import { STORAGE_SERVICES_CACHE } from '../lib/constants';

export const servicesQueryKey = ['services'] as const;

// Cache offline no localStorage (fallback para quando não há conexão)
function loadCache(): Service[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_SERVICES_CACHE);
    if (stored) {
      const parsed = JSON.parse(stored) as { data: Service[]; timestamp: number };
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch (e) {
    logError(e);
  }
  return null;
}

function saveCache(data: Service[]) {
  try {
    localStorage.setItem(STORAGE_SERVICES_CACHE, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    logError(e);
  }
}

/**
 * Hook para carregar e gerenciar a lista de serviços via React Query.
 *
 * - Cache automático (5 min staleTime)
 * - Cache offline no localStorage (fallback de 24h)
 * - Refetch automático ao focar a janela / reconectar
 * - Retry automático (2 tentativas)
 *
 * @returns {{ services, loading, error, refetch, isOffline }}
 */
export function useServices() {
  // Memoiado: garante referência estável entre renders para evitar
  // que o React Query reavalie placeholderData a cada render.
  const cache = useMemo(() => loadCache(), []);

  const query = useQuery({
    queryKey: servicesQueryKey,
    queryFn: async () => {
      const data = await getServices();
      saveCache(data);
      return data;
    },
    // Estado inicial: mostra cache do localStorage imediatamente
    placeholderData: cache ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // isOffline: true se está mostrando placeholder (cache) e não está carregando
  const isOffline = query.isPlaceholderData && !query.isFetching;

  return {
    services: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => query.refetch(),
    isOffline,
  };
}

/** Limpa o cache de servicos (localStorage) */
export function clearServicesCache() {
  try {
    localStorage.removeItem(STORAGE_SERVICES_CACHE);
  } catch (e) {
    logError(e);
  }
}
