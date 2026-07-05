import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'bd_weekly_congrats_sent';

/**
 * Sends a push notification congratulating the barber on Saturday evening.
 * Tracks via localStorage to avoid duplicate sends per week.
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

    // Fetch barber name and send notification
    fetchBarberName().then((name) => {
      const displayName = name || 'Barbeiro';
      const msg = `Boa noite, ${displayName}! 💈\n\nParabéns pelo trabalho durante a semana!\n\n📊 Resumo da semana:\n• Faturamento: R$ ${weeklyRevenue.toFixed(2).replace('.', ',')}\n• Atendimentos: ${weeklyCompleted}\n\nBom descanso e até segunda! 🏆`;

      sendCongratsPush(msg, weekKey);
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

async function sendCongratsPush(message: string, weekKey: string) {
  try {
    // Get all active push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (!subscriptions || subscriptions.length === 0) return;

    // VAPID keys are handled server-side by the edge function — never expose them to the client
    for (const sub of subscriptions) {
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            subscription: {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload: {
              title: 'Black Diamond 🏆',
              body: message,
              icon: '/assets/logo.webp',
              badge: '/assets/logo.webp',
              tag: `weekly-congrats-${weekKey}`,
            },
          },
        });
      } catch {
        // Continue with other subscriptions
      }
    }

    // Mark as sent
    try {
      localStorage.setItem(STORAGE_KEY, weekKey);
    } catch {
      /* ignore */
    }
  } catch {
    // Silent fail - notification is nice-to-have
  }
}
