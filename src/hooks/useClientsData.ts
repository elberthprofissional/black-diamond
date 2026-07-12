import { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import { getClients, getBookingsForStats } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { BLOCKED_NAME, BLOCKED_PHONE, INACTIVE_DAYS, MASK_SENSITIVE_DATA } from '../lib/constants';
import { maskName, maskPhone, maskEmail } from '../lib/utils';
import type { Client, ClientWithStats } from '../types';

interface ClientWithHistory extends Client {
  historical_visits?: number;
  historical_spent?: number;
  last_visit_date?: string;
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

/** Busca counts de no_show por client_id nos últimos 90 dias */
async function getNoShowCounts(): Promise<Map<string, number>> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('no_show', true)
      .gte('booking_date', cutoffStr);

    const map = new Map<string, number>();
    if (!data) return map;
    for (const row of data) {
      if (row.client_id) {
        map.set(row.client_id, (map.get(row.client_id) || 0) + 1);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Busca o limite máximo de faltas configurado */
async function getMaxNoShowsSetting(): Promise<number> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'max_no_shows')
      .maybeSingle();
    return data?.value ? parseInt(data.value, 10) : 3;
  } catch {
    return 3;
  }
}

export function useClientsData() {
  const { showError } = useToast();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
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
      const [clientsData, bookingsData, noShowCounts, maxNoShows] = await Promise.all([
        getClients(),
        getBookingsForStats(),
        getNoShowCounts(),
        getMaxNoShowsSetting(),
      ]);
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
            !c.deleted_at &&
            c.name !== BLOCKED_NAME &&
            c.phone !== BLOCKED_PHONE &&
            !c.is_blocked
        )
        .map((c: Client) => {
          const ch = c as ClientWithHistory;
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

          // Current stats from active bookings
          const currentSpent = cb.reduce((s, b) => s + Number(b.total_price || 0), 0);
          const currentVisits = cb.length;

          // Historical stats from deleted bookings
          const histVisits = ch.historical_visits || 0;
          const histSpent = Number(ch.historical_spent || 0);

          // Combined stats
          const totalSpent = currentSpent + histSpent;
          const bookingsCount = currentVisits + histVisits;

          // Last visit: compare current last visit with preserved historical last visit
          const currentLastVisit = lb ? new Date(lb.booking_date + 'T00:00:00') : null;
          const histLastVisit = ch.last_visit_date
            ? new Date(ch.last_visit_date + 'T00:00:00')
            : null;
          const lastVisitDate =
            currentLastVisit && histLastVisit
              ? currentLastVisit > histLastVisit
                ? currentLastVisit
                : histLastVisit
              : currentLastVisit || histLastVisit;

          const isInactive = lastVisitDate
            ? daysSince(lastVisitDate.toISOString().slice(0, 10)) > INACTIVE_DAYS
            : bookingsCount === 0;

          const noShowCount = noShowCounts.get(c.id) || 0;
          const isNoShowBlocked = noShowCount >= maxNoShows;

          return {
            ...c,
            _originalName: c.name,
            _originalPhone: c.phone,
            name: MASK_SENSITIVE_DATA ? maskName(c.name) : c.name,
            phone: MASK_SENSITIVE_DATA ? maskPhone(c.phone) : c.phone,
            email: MASK_SENSITIVE_DATA && c.email ? maskEmail(c.email) : c.email,
            notes: MASK_SENSITIVE_DATA && c.notes ? 'Informações ocultadas para o vídeo' : c.notes,
            lastVisit: lastVisitDate ? lastVisitDate.toLocaleDateString('pt-BR') : 'Nunca',
            lastVisitDate,
            totalSpent: MASK_SENSITIVE_DATA ? 0 : totalSpent,
            bookingsCount,
            upcomingBooking: upcoming
              ? {
                  date: new Date(upcoming.booking_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  }),
                  time: (upcoming.booking_time || '').slice(0, 5),
                }
              : null,
            isInactive,
            isNoShowBlocked,
          };
        });

      const enriched = allEnriched;
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!mountedRef.current) return;
      setClients(enriched);
    } catch {
      if (!mountedRef.current) return;
      showError('Erro ao carregar dados.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showError]);

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

  return { clients, setClients, loading, searchTerm, setSearchTerm, debouncedSearch, loadData };
}
