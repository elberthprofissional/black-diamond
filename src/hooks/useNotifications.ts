import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fireAndForget } from '../lib/fire-and-forget';
import { useNotificationPrefs } from './useNotificationPrefs';
import { playNotificationSound } from '../lib/notification-sound';
import type { Notification } from '../types';

export type { Notification } from '../types';

// ─── Query Key ────────────────────────────────────────────────────────────

export const notificationsQueryKey = ['notifications'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

function updateTitleBadge(count: number) {
  const baseTitle = 'Black Diamond';
  document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
}

// ─── Singleton: Realtime Channel ─────────────────────────────────────────

let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let activeUserId: string | null = null;
let isSettingUp = false;
const MAX_RETRIES = 15;

// ─── Fetch ────────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<Notification[]> {
  if (!supabase?.auth?.getUser) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return data || [];
}

// ─── Hook Unificado ───────────────────────────────────────────────────────

/**
 * Hook único de notificações — unifica fetch, realtime e CRUD.
 *
 * Composição interna:
 * - {@link useQuery} para fetch inicial + stale-while-revalidate
 * - Realtime subscription (singleton) para inserts/updates/deletes
 * - {@link useMutation} para markAsRead / markAllAsRead / clear / bulkDelete
 * - Preferências via {@link useNotificationPrefs}
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState<Notification | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Preferências do usuário
  const { prefs } = useNotificationPrefs();
  const prefsRef = useRef(prefs);

  // Mantém ref sincronizado
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  // ── Fetch via useQuery ──────────────────────────────────────────────
  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    staleTime: 5 * 60 * 1000,
  });

  const notifications = useMemo(() => query.data ?? [], [query.data]);

  // Atualiza o cache de notificações (usado pelo Realtime)
  const setNotifications = useCallback(
    (updater: Notification[] | ((prev: Notification[]) => Notification[])) => {
      queryClient.setQueryData<Notification[]>(notificationsQueryKey, (prev) => {
        const current = prev ?? [];
        return typeof updater === 'function' ? updater(current) : updater;
      });
    },
    [queryClient]
  );

  // ── Realtime Subscription (singleton) ───────────────────────────────
  useEffect(() => {
    let mounted = true;
    let localChannelId = 0;

    const setupRealtime = async () => {
      try {
        if (!mounted || !supabase?.auth?.getUser || isSettingUp) return;
        isSettingUp = true;

        // Limpa channel stale antes do async gap
        if (activeChannel && activeUserId) {
          const stale = activeChannel;
          activeChannel = null;
          activeUserId = null;
          fireAndForget(supabase.removeChannel(stale), {
            context: 'useNotifications/cleanupStale',
          });
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        if (activeChannel && activeUserId === user.id) return;

        activeUserId = user.id;
        localChannelId++;
        const channelName = `notifications-${user.id}-${localChannelId}`;

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
                  if (prev.some((n) => n.id === newNotif.id)) return prev;
                  return [newNotif, ...prev].slice(0, 50);
                });

                const p = prefsRef.current;
                if (p.inApp && p.sound) playNotificationSound();
                if (p.inApp && p.preview) {
                  setShowPreview(newNotif);
                  if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                  previewTimerRef.current = setTimeout(() => setShowPreview(null), 5000);
                }
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as Notification).id;
                setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as Notification;
                setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
              }
            }
          )
          .subscribe((status) => {
            if (!mounted) return;
            if (status === 'SUBSCRIBED') {
              retryCountRef.current = 0;
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
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

        activeChannel = channel;
      } catch (e) {
        logError(e);
      } finally {
        isSettingUp = false;
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (activeChannel) {
        const ch = activeChannel;
        activeChannel = null;
        activeUserId = null;
        fireAndForget(supabase.removeChannel(ch), {
          context: 'useNotifications/cleanupChannel',
        });
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── CRUD Mutations ──────────────────────────────────────────────────

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      const previous = queryClient.getQueryData<Notification[]>(notificationsQueryKey);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) setNotifications(context.previous);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
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
      if (error) throw error;
    },
    onMutate: async () => {
      const previous = queryClient.getQueryData<Notification[]>(notificationsQueryKey);
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) setNotifications(context.previous);
    },
  });

  const clearNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      const previous = queryClient.getQueryData<Notification[]>(notificationsQueryKey);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) setNotifications(context.previous);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('notifications').delete().in('id', ids);
      if (error) throw error;
    },
    onMutate: async (ids: string[]) => {
      if (ids.length === 0) return {};
      const previous = queryClient.getQueryData<Notification[]>(notificationsQueryKey);
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) setNotifications(context.previous);
    },
  });

  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const clearNotification = useCallback(
    async (id: string) => {
      await clearNotificationMutation.mutateAsync(id);
    },
    [clearNotificationMutation]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation]
  );

  const dismissPreview = useCallback(() => {
    setShowPreview(null);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  }, []);

  // ── Badge no título ─────────────────────────────────────────────────
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    if (prefs.badge) {
      updateTitleBadge(count);
    } else {
      document.title = 'Black Diamond';
    }
  }, [notifications, prefs.badge]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    bulkDelete,
    refetch: () => query.refetch(),
    showPreview,
    dismissPreview,
  };
}
