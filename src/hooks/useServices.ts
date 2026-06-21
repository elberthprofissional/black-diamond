import { useState, useEffect } from 'react';
import { getServices } from '../lib/api';
import type { Service } from '../types';

let cachedServices: Service[] | null = null;

export function useServices() {
  const [services, setServices] = useState<Service[]>(cachedServices || []);
  const [loading, setLoading] = useState(!cachedServices);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {

    const fetchServices = async () => {
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
    };

    fetchServices();
  }, []);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await getServices();
      cachedServices = data;
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
    } finally {
      setLoading(false);
    }
  };

  return { services, loading, error, refetch };
}
