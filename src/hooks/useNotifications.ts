import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
}

// AudioContext reutilizável para evitar esgotar o limite do browser
let sharedAudioContext: AudioContext | null = null;

// Generate notification sound using Web Audio API (no external files needed)
function playNotificationSound() {
  try {
    // Reutiliza contexto existente ou cria um novo
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    const ctx = sharedAudioContext;

    // Resume se estiver suspenso (política de autoplay)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Pleasant two-tone chime
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available — silently fail
  }
}

// Update document title with unread count badge
function updateTitleBadge(count: number) {
  const baseTitle = 'Black Diamond';
  if (count > 0) {
    document.title = `(${count}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState<Notification | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsRef = useRef<Notification[]>([]);

  // Keep ref in sync with state
  notificationsRef.current = notifications;

  const fetchNotifications = useCallback(async () => {
    try {
      if (!supabase?.auth?.getUser) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Update document title badge when unread count changes
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    updateTitleBadge(count);
  }, [notifications]);

  // Realtime subscription with auto-reconnect
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const channelIdRef = useRef(0);
  const isSettingUpRef = useRef(false);
  const MAX_RETRIES = 15;

  useEffect(() => {
    let mounted = true;

    const setupRealtime = async () => {
      // Guard contra execução concorrente (ex: retry + outro erro)
      if (isSettingUpRef.current) return;
      isSettingUpRef.current = true;

      try {
        if (!mounted) return;
        if (!supabase?.auth?.getUser) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Remove canal anterior se existir
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          // Espera um tick para garantir que o canal foi removido completamente
          await new Promise((r) => setTimeout(r, 100));
        }

        // Nome único para evitar que o Supabase reutilize o canal antigo (já subscrito)
        channelIdRef.current++;
        const channelName = `notifications-${user.id}-${channelIdRef.current}`;

        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newNotif = payload.new as Notification;
                setNotifications((prev) => {
                  // Evita duplicatas
                  if (prev.some((n) => n.id === newNotif.id)) return prev;
                  return [newNotif, ...prev].slice(0, 50);
                });

                // Toca som
                playNotificationSound();

                // Preview toast
                setShowPreview(newNotif);
                if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                previewTimerRef.current = setTimeout(() => setShowPreview(null), 5000);
              } else if (payload.eventType === 'DELETE') {
                // Remove notificação deletada (ex: trigger de cancelamento)
                const deletedId = (payload.old as Notification).id;
                setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
              } else if (payload.eventType === 'UPDATE') {
                // Atualiza notificação em tempo real (ex: marcou como lida em outra aba)
                const updated = payload.new as Notification;
                setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
              }
            }
          )
          .subscribe((status) => {
            if (!mounted) return;

            if (status === 'SUBSCRIBED') {
              // Conexão OK — reseta contagem de retry
              retryCountRef.current = 0;
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              // Reconexão automática com backoff exponencial
              if (retryCountRef.current < MAX_RETRIES) {
                const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
                retryCountRef.current++;

                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                retryTimerRef.current = setTimeout(() => {
                  if (mounted) setupRealtime();
                }, delay);
              }
            }
          });

        channelRef.current = channel;
      } finally {
        isSettingUpRef.current = false;
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const dismissPreview = useCallback(() => {
    setShowPreview(null);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const snapshot = notificationsRef.current;
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    if (!supabase?.auth?.getUser) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) {
      setNotifications(snapshot);
    }
  }, []);

  const clearNotification = useCallback(async (id: string) => {
    const removed = notificationsRef.current.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error && removed) {
      setNotifications((prev) =>
        [...prev, removed].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    }
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refetch: fetchNotifications,
    showPreview,
    dismissPreview,
  };
}
