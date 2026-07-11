import { useState, useEffect, useCallback } from 'react';
import {
  getActiveBarbers,
  getAllBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  getBarberStats,
} from '../lib/api/barbers';
import { getErrorMessage } from '../lib/utils';
import type { Barber } from '../types';

export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeBarbers, setActiveBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);

  const loadBarbers = useCallback(async () => {
    try {
      const [all, active] = await Promise.all([getAllBarbers(), getActiveBarbers()]);
      setBarbers(all);
      setActiveBarbers(active);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  const handleCreate = useCallback(
    async (data: Omit<Barber, 'id' | 'created_at'>): Promise<string | null> => {
      try {
        const result = await createBarber(data);
        await loadBarbers();
        return result.id;
      } catch (err) {
        throw new Error(getErrorMessage(err), { cause: err });
      }
    },
    [loadBarbers]
  );

  const handleUpdate = useCallback(
    async (id: string, data: Partial<Omit<Barber, 'id' | 'created_at'>>) => {
      try {
        await updateBarber(id, data);
        await loadBarbers();
      } catch (err) {
        throw new Error(getErrorMessage(err), { cause: err });
      }
    },
    [loadBarbers]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBarber(id);
        await loadBarbers();
        if (selectedBarberId === id) setSelectedBarberId(null);
      } catch (err) {
        throw new Error(getErrorMessage(err), { cause: err });
      }
    },
    [loadBarbers, selectedBarberId]
  );

  const getStats = useCallback(async (barberId: string, startDate: string, endDate: string) => {
    return getBarberStats(barberId, startDate, endDate);
  }, []);

  return {
    barbers,
    activeBarbers,
    loading,
    selectedBarberId,
    setSelectedBarberId,
    loadBarbers,
    createBarber: handleCreate,
    updateBarber: handleUpdate,
    deleteBarber: handleDelete,
    getBarberStats: getStats,
  };
}
