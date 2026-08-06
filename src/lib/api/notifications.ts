import { supabase } from '../supabase';
import { logError } from '../logger';

interface CreateNotificationParams {
  title: string;
  body: string;
  tag?: string | null;
  url?: string | null;
  /** ID do usuário que receberá a notificação. Se omitido, usa o usuário logado. */
  userId?: string;
}

/**
 * Cria uma notificação no banco.
 * - Se `userId` for informado, cria para aquele usuário.
 * - Se não, tenta pegar o usuário logado via `supabase.auth.getUser()`.
 * - Se ninguém for resolvido, a notificação não é criada (fire-and-forget seguro).
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    let targetUserId = params.userId;

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      targetUserId = user.id;
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      title: params.title,
      body: params.body,
      tag: params.tag ?? null,
      url: params.url ?? null,
    });

    if (error) logError(error, 'createNotification');
  } catch (e) {
    logError(e, 'createNotification');
  }
}

/**
 * Marca uma notificação como lida.
 */
export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

/**
 * Marca todas as notificações do usuário como lidas.
 */
export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

/**
 * Deleta uma notificação.
 */
export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Deleta múltiplas notificações.
 */
export async function bulkDeleteNotifications(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from('notifications').delete().in('id', ids);
  if (error) throw error;
}
