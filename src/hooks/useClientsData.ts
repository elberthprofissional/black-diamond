import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { getClients, getBookingsForStats } from '../lib/api';
import { useToast } from './useToast';
import type { Client, ClientWithStats } from '../types';

export function useClientsData() {
  const { showError } = useToast();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDeferredValue(searchTerm);

  const loadData = useCallback(async () => {
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookingsForStats()]);
      const todayISO = new Date();
      todayISO.setHours(0, 0, 0, 0);

      const bookingsByClient = new Map<string, typeof bookingsData>();
      for (const b of bookingsData || []) {
        if (!b || b.status === 'cancelled') continue;
        const list = bookingsByClient.get(b.client_id) || [];
        list.push(b);
        bookingsByClient.set(b.client_id, list);
      }

      const allEnriched: ClientWithStats[] = (clientsData || [])
        .filter(
          (c: Client) =>
            c &&
            c.name &&
            c.name !== 'BLOQUEADO' &&
            c.name !== 'CLIENTE EXCLUIDO' &&
            c.phone !== '00000000000' &&
            !c.is_blocked
        )
        .map((c: Client) => {
          const cb = bookingsByClient.get(c.id) || [];
          const upcoming = cb
            .filter((b) => {
              const bookingDate = new Date(b.booking_date + 'T00:00:00');
              return bookingDate >= todayISO;
            })
            .sort(
              (a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
            )[0];
          const pastBookings = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate <= todayISO;
          });
          const lb = [...pastBookings].sort(
            (a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
          )[0];
          return {
            ...c,
            lastVisit: lb ? new Date(lb.booking_date).toLocaleDateString('pt-BR') : 'Nunca',
            totalSpent: cb.reduce((s, b) => s + Number(b.total_price || 0), 0),
            bookingsCount: cb.length,
            upcomingBooking: upcoming
              ? {
                  date: new Date(upcoming.booking_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  }),
                  time: (upcoming.booking_time || '').slice(0, 5),
                }
              : null,
          };
        });

      const enriched = allEnriched.filter((c) => c.bookingsCount >= 2 || c.manually_added);
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(enriched);
    } catch {
      showError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let lastFetch = 0;
    const handleRefresh = () => {
      const now = Date.now();
      if (now - lastFetch < 2000) return; // 2s cooldown
      lastFetch = now;
      loadData();
    };
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [loadData]);

  return { clients, setClients, loading, searchTerm, setSearchTerm, debouncedSearch, loadData };
}
