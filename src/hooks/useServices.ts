import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../lib/api';
import type { Service } from '../types';

let cachedServices: Service[] | null = null;

export function useServices() {
  const [services, setServices] = useState<Service[]>(cachedServices || []);
  const [loading, setLoading] = useState(!cachedServices);
  const [error, setError] = useState<Error | null>(null);

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
      setServices(data);
    } catch (err) {
      if (!cachedServices) {
        setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const refetch = useCallback(() => fetchServices(true), [fetchServices]);

  return { services, loading, error, refetch };
}

export function clearServicesCache() {
  cachedServices = null;
}
