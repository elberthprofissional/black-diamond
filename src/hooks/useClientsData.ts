import { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import { getClients } from '../lib/api';
import { getMensalistaPlans } from '../lib/api/settings';
import { useToast } from './useToast';
import { BLOCKED_NAME, BLOCKED_PHONE, INACTIVE_DAYS } from '../lib/constants';
import { getLocalDateString } from '../lib/utils';
import type { Client, ClientWithStats, MensalistaPlan } from '../types';
import { logError } from '../lib/logger';

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useClientsData() {
  const { showError } = useToast();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [plans, setPlans] = useState<MensalistaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDeferredValue(searchTerm);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [clientsData, plans] = await Promise.all([getClients(), getMensalistaPlans()]);

      setPlans(plans);

      const enriched: ClientWithStats[] = (clientsData || [])
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
          const lastVisitDate = c.last_visit_date
            ? new Date(c.last_visit_date + 'T00:00:00')
            : null;

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
        });

      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!mountedRef.current) return;
      setClients(enriched);
    } catch (e) {
      logError(e);
      if (!mountedRef.current) return;
      showError('Erro ao carregar dados.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showError]);

  // Initial data fetching — call to loadData sets state intentionally
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let lastFetch = 0;
    const handleRefresh = () => {
      const now = Date.now();
      if (now - lastFetch < 2000) return;
      lastFetch = now;
      loadData();
    };
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [loadData]);

  // Periodic refresh every 5 minutes to catch backend changes
  useEffect(() => {
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  return {
    clients,
    setClients,
    plans,
    loading,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    loadData,
  };
}
