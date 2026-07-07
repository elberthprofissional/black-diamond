import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'bd_weekly_congrats_sent';

/**
 * Sends a push notification congratulating the barber on Saturday evening.
 * Tracks via localStorage to avoid duplicate sends per week.
 * Calls the send-push Edge Function once — it handles sending to all subscriptions.
 */
export function useWeeklyCongrats(weeklyRevenue: number, weeklyCompleted: number) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    if (weeklyRevenue <= 0 && weeklyCompleted <= 0) return;

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // Only on Saturday after 18:00
    if (day !== 6 || hour < 18) return;

    // Check if already sent this week
    const weekKey = getWeekKey(now);
    try {
      const lastSent = localStorage.getItem(STORAGE_KEY);
      if (lastSent === weekKey) return;
    } catch {
      /* ignore */
    }

    sentRef.current = true;

    // Fetch barber name and send notification via Edge Function
    fetchBarberName().then((name) => {
      const displayName = name || 'Barbeiro';
      const msg = `Boa noite, ${displayName}! 💈\n\nParabéns pelo trabalho durante a semana!\n\n📊 Resumo da semana:\n• Faturamento: R$ ${weeklyRevenue.toFixed(2).replace('.', ',')}\n• Atendimentos: ${weeklyCompleted}\n\nBom descanso e até segunda! 🏆`;

      // Call Edge Function once — it handles sending to all subscriptions
      supabase.functions.invoke('send-push', {
        body: {
          title: 'Black Diamond 🏆',
          body: msg,
          tag: `weekly-congrats-${weekKey}`,
        },
      }).then(() => {
        try {
          localStorage.setItem(STORAGE_KEY, weekKey);
        } catch { /* ignore */ }
      }).catch(() => {
        // Silent fail - notification is nice-to-have
      });
    });
  }, [weeklyRevenue, weeklyCompleted]);
}

function getWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber}`;
}

async function fetchBarberName(): Promise<string> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'barber_name')
      .maybeSingle();
    return data?.value || '';
  } catch {
    return '';
  }
}
