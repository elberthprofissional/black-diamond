import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../lib/api';
import type { Service } from '../types';
import { logError } from '../lib/logger';
import { STORAGE_SERVICES_CACHE } from '../lib/constants';

let cachedServices: Service[] | null = null;

// Carrega cache do localStorage na inicialização
function loadCache(): Service[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_SERVICES_CACHE);
    if (stored) {
      const parsed = JSON.parse(stored) as { data: Service[]; timestamp: number };
      // Cache válido por 24 horas
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch (e) {
    logError(e);
    // Ignora erro de parse
  }
  return null;
}

// Salva cache no localStorage
function saveCache(data: Service[]) {
  try {
    localStorage.setItem(STORAGE_SERVICES_CACHE, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    logError(e);
    // localStorage cheio ou indisponível
  }
}

export function useServices() {
  const [services, setServices] = useState<Service[]>(() => cachedServices || loadCache() || []);
  const [loading, setLoading] = useState(!cachedServices && !loadCache());
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchServices = useCallback(async (force = false) => {
    if (!force && cachedServices) {
      setServices(cachedServices);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getServices();
      cachedServices = data;
      saveCache(data);
      setServices(data);
      setIsOffline(false);
    } catch (err) {
      // Tenta usar cache do localStorage se falhou
      const localCache = loadCache();
      if (localCache) {
        cachedServices = localCache;
        setServices(localCache);
        setIsOffline(true);
      } else if (!cachedServices) {
        setError(err instanceof Error ? err : new Error('Erro ao carregar serviços.'));
      } else {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchServices();
  }, [fetchServices]);

  // Monitora conectividade pra tentar recarregar quando voltar online
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Recarrega silenciosamente quando voltar online
      getServices()
        .then((data) => {
          cachedServices = data;
          saveCache(data);
          setServices(data);
        })
        .catch(() => {
          // Se falhou mesmo online, só ignora
        });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const refetch = useCallback(() => fetchServices(true), [fetchServices]);

  return { services, loading, error, refetch, isOffline };
}

/** Limpa o cache de servicos (memoria + localStorage) */
export function clearServicesCache() {
  cachedServices = null;
  try {
    localStorage.removeItem(STORAGE_SERVICES_CACHE);
  } catch (e) {
    logError(e);
    // ignore storage failures
  }
}
