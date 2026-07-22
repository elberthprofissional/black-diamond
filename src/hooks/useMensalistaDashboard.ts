import { useState, useEffect, useMemo, useCallback } from 'react';
import { getClients, getMensalistaPlans } from '../lib/api';
import { logError } from '../lib/logger';
import type { Client, MensalistaPlan } from '../types';

export interface MensalistaClient {
  id: string;
  name: string;
  phone: string;
  planId: string | null;
  planName: string;
  planPrice: number;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface PlanStats {
  planId: string;
  planName: string;
  planPrice: number;
  clientCount: number;
  monthlyRevenue: number;
}

export interface MensalistaDashboardData {
  totalActive: number;
  totalMonthlyRevenue: number;
  expiringCount: number;
  expiredCount: number;
  planStats: PlanStats[];
  expiringClients: MensalistaClient[];
  expiredClients: MensalistaClient[];
  activeClients: MensalistaClient[];
  allClients: MensalistaClient[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const EXPIRY_WARNING_DAYS = 7;

function computeDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt + 'T00:00:00');
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function useMensalistaDashboard(): MensalistaDashboardData {
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<MensalistaPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [clientsData, plansData] = await Promise.all([getClients(), getMensalistaPlans()]);
      setClients(clientsData);
      setPlans(plansData);
    } catch (e) {
      logError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const planMap = useMemo(() => {
    const map = new Map<string, MensalistaPlan>();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const allMensalistas = useMemo(() => {
    return clients
      .filter((c) => c.is_mensalista)
      .map((c) => {
        const plan = c.mensalista_plan_id ? planMap.get(c.mensalista_plan_id) : null;
        const daysUntilExpiry = computeDaysUntilExpiry(c.mensalista_expires_at ?? null);
        const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
        const isExpiringSoon =
          daysUntilExpiry !== null &&
          daysUntilExpiry >= 0 &&
          daysUntilExpiry <= EXPIRY_WARNING_DAYS;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          planId: c.mensalista_plan_id ?? null,
          planName: plan?.name || 'Plano',
          planPrice: plan?.price || 0,
          expiresAt: c.mensalista_expires_at ?? null,
          daysUntilExpiry,
          isExpired,
          isExpiringSoon,
        };
      })
      .sort((a, b) => {
        if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
        if (a.isExpiringSoon !== b.isExpiringSoon) return a.isExpiringSoon ? -1 : 1;
        if (a.daysUntilExpiry !== null && b.daysUntilExpiry !== null) {
          return a.daysUntilExpiry - b.daysUntilExpiry;
        }
        return 0;
      });
  }, [clients, planMap]);

  const planStats = useMemo(() => {
    const statsMap = new Map<string, { count: number }>();
    allMensalistas.forEach((c) => {
      if (!c.isExpired) {
        const key = c.planId || 'none';
        const existing = statsMap.get(key) || { count: 0 };
        statsMap.set(key, { count: existing.count + 1 });
      }
    });

    return plans
      .filter((p) => p.is_active)
      .map((p) => {
        const stats = statsMap.get(p.id) || { count: 0 };
        return {
          planId: p.id,
          planName: p.name,
          planPrice: p.price,
          clientCount: stats.count,
          monthlyRevenue: stats.count * p.price,
        };
      })
      .filter((s) => s.clientCount > 0)
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
  }, [allMensalistas, plans]);

  return useMemo(
    () => ({
      totalActive: allMensalistas.filter((c) => !c.isExpired).length,
      totalMonthlyRevenue: planStats.reduce((sum, s) => sum + s.monthlyRevenue, 0),
      expiringCount: allMensalistas.filter((c) => c.isExpiringSoon).length,
      expiredCount: allMensalistas.filter((c) => c.isExpired).length,
      planStats,
      expiringClients: allMensalistas.filter((c) => c.isExpiringSoon),
      expiredClients: allMensalistas.filter((c) => c.isExpired),
      activeClients: allMensalistas.filter((c) => !c.isExpired && !c.isExpiringSoon),
      allClients: allMensalistas,
      loading,
      refetch: fetchData,
    }),
    [allMensalistas, planStats, loading, fetchData]
  );
}
