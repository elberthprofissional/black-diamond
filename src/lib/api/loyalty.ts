import { supabase } from '../supabase';
import type { LoyaltyMilestone, MilestoneProgress } from '../../types';

/* ─── Milestones (múltiplas metas) ─── */

/** Busca todas as milestones configuradas. */
export const getMilestones = async (): Promise<LoyaltyMilestone[]> => {
  const { data, error } = await supabase
    .from('loyalty_milestones')
    .select('*')
    .order('visits_required', { ascending: true });
  if (error) throw error;
  return (data || []) as LoyaltyMilestone[];
};

/** Salva a lista completa de milestones (substitui todas). */
export const saveMilestones = async (
  milestones: { visits_required: number; reward_service_id: string }[]
): Promise<void> => {
  // Deleta todas as existentes e insere as novas
  const { error: delErr } = await supabase
    .from('loyalty_milestones')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw delErr;

  if (milestones.length === 0) return;

  const { error: insErr } = await supabase.from('loyalty_milestones').insert(
    milestones.map((m) => ({
      visits_required: m.visits_required,
      reward_service_id: m.reward_service_id,
    }))
  );
  if (insErr) throw insErr;
};

/** Ativa/desativa o sistema (se não houver milestones, limpa). */
export const setLoyaltyEnabled = async (enabled: boolean): Promise<void> => {
  if (!enabled) {
    const { error } = await supabase
      .from('loyalty_milestones')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }
};

/* ─── Progresso do cliente ─── */

/** Retorna o progresso do cliente em todas as milestones. */
export const getClientMilestones = async (clientId: string): Promise<MilestoneProgress[]> => {
  // Busca milestones ativas
  const { data: milestones, error: mErr } = await supabase
    .from('loyalty_milestones')
    .select('*')
    .eq('is_active', true)
    .order('visits_required', { ascending: true });
  if (mErr) throw mErr;
  if (!milestones || milestones.length === 0) return [];

  // Busca visitas do cliente
  const { data: client } = await supabase
    .from('clients')
    .select('historical_visits')
    .eq('id', clientId)
    .single();
  const visits = client?.historical_visits ?? 0;

  // Busca milestones já resgatadas por este cliente
  const { data: claimed } = await supabase
    .from('client_milestones')
    .select('milestone_id')
    .eq('client_id', clientId);
  const claimedIds = new Set((claimed || []).map((c) => c.milestone_id));

  return (milestones as LoyaltyMilestone[]).map((m) => ({
    milestone: m,
    progress: visits,
    already_claimed: claimedIds.has(m.id),
  }));
};

/** Marca uma milestone como resgatada para o cliente. */
export const claimMilestone = async (clientId: string, milestoneId: string): Promise<void> => {
  const { error } = await supabase.from('client_milestones').insert({
    client_id: clientId,
    milestone_id: milestoneId,
  });
  if (error) {
    if (error.code === '23505') return; // unique violation — já resgatou
    throw error;
  }
};

/* ─── Incremento de visita (chamado ao completar booking) ─── */

interface IncrementResult {
  newMilestones: MilestoneProgress[]; // milestones que o cliente ACABOU de atingir
}

/**
 * Incrementa historical_visits do cliente.
 * NUNCA reseta — só acumula.
 * Retorna quais milestones foram atingidas AGORA (pra notificar).
 */
export const incrementVisit = async (clientId: string): Promise<IncrementResult> => {
  // 1. Incrementa visitas
  // Nota: Race condition baixo risco em contexto de barbearia (dois bookings
  // do mesmo cliente completando no mesmo milissegundo é extremamente raro)
  const { data: client } = await supabase
    .from('clients')
    .select('historical_visits, name, phone')
    .eq('id', clientId)
    .single();
  const newCount = (client?.historical_visits ?? 0) + 1;

  await supabase.from('clients').update({ historical_visits: newCount }).eq('id', clientId);

  // 2. Busca milestones + claimed
  const { data: milestones } = await supabase
    .from('loyalty_milestones')
    .select('*')
    .eq('is_active', true)
    .order('visits_required', { ascending: true });

  if (!milestones || milestones.length === 0) {
    return { newMilestones: [] };
  }

  const { data: claimed } = await supabase
    .from('client_milestones')
    .select('milestone_id')
    .eq('client_id', clientId);
  const claimedIds = new Set((claimed || []).map((c) => c.milestone_id));

  // 3. Descobre quais milestones foram atingidas AGORA (antes não tinha visitas suficientes)
  const newMilestones: MilestoneProgress[] = [];

  for (const m of milestones as LoyaltyMilestone[]) {
    if (newCount >= m.visits_required && !claimedIds.has(m.id)) {
      // Atingiu agora — registra
      try {
        await claimMilestone(clientId, m.id);
      } catch {
        // se já foi resgatado entre a leitura e a escrita, ignora
      }

      // Busca nome do serviço pra notificação
      const { data: svc } = await supabase
        .from('services')
        .select('name')
        .eq('id', m.reward_service_id)
        .single();
      const rewardName = svc?.name || 'serviço gratuito';

      // Cria notificação pros admins
      try {
        const { data: admins } = await supabase.from('admin_users').select('user_id');
        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: { user_id: string }) => ({
            user_id: admin.user_id,
            title: `🎉 ${client?.name || 'Cliente'} atingiu ${m.visits_required} visitas!`,
            body: JSON.stringify({
              clientName: client?.name || 'Cliente',
              services: rewardName,
              dateTime: `${m.visits_required} visitas às —`,
              totalPrice: 'Grátis! 🏆',
              clientPhone: client?.phone || '',
              manageUrl: '/admin/clients',
            }),
            tag: `loyalty-milestone-${clientId}-${m.id}`,
            url: '/admin/clients',
            read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch {
        // notificação não crítica
      }

      newMilestones.push({
        milestone: m,
        progress: newCount,
        already_claimed: true,
      });
    }
  }

  return { newMilestones };
};

/** Retorna o total de milestones já resgatadas por um cliente. */
export const getClaimedCount = async (clientId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('client_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);
  if (error) return 0;
  return count ?? 0;
};
