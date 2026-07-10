import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../lib/api';
import type { Service } from '../types';

const CACHE_KEY = 'barber_services_cache';

let cachedServices: Service[] | null = null;

// Carrega cache do localStorage na inicialização
function loadCache(): Service[] | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { data: Service[]; timestamp: number };
      // Cache válido por 24 horas
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch {
    // Ignora erro de parse
  }
  return null;
}

// Salva cache no localStorage
function saveCache(data: Service[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
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
        setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      } else {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage failures
  }
}
