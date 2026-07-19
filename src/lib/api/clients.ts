import { supabase } from '../supabase';
import { BLOCKED_NAME, BLOCKED_PHONE } from '../constants';

/** Busca todos os clientes cadastrados, ordenados por nome. Exclui soft-deletados. */
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, name, phone, email, notes, is_favorite, is_mensalista, mensalista_plan_id, mensalista_expires_at, is_blocked, deleted_at, manually_added, historical_visits, historical_spent, last_visit_date, created_at'
    )
    .is('deleted_at', null)
    .not('name', 'eq', BLOCKED_NAME)
    .not('phone', 'eq', BLOCKED_PHONE)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

/** Soft-deleta todos os clientes e exclui seus agendamentos. */
export const deleteAllClients = async (): Promise<number> => {
  // 1. Busca IDs dos clientes ativos
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .is('deleted_at', null)
    .not('name', 'eq', BLOCKED_NAME)
    .neq('phone', BLOCKED_PHONE);
  if (fetchError) throw fetchError;
  if (!clients || clients.length === 0) return 0;

  const clientIds = clients.map((c) => c.id);

  // 2. Deleta APENAS os bookings desses clientes
  const { error: bookingError } = await supabase
    .from('bookings')
    .delete()
    .in('client_id', clientIds);
  if (bookingError) throw bookingError;

  // 3. Soft-deleta os clientes
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('clients')
    .update({ deleted_at: now })
    .in('id', clientIds);
  if (updateError) throw updateError;

  return clients.length;
};

/** Soft-deleta um cliente (preserva nome e telefone originais para histórico). */
export const deleteClient = async (id: string) => {
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

/** Cria um novo cliente. Trata violação de unique constraint. */
export const createClient = async (data: {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  manually_added?: boolean;
}) => {
  const { data: newClient, error } = await supabase.from('clients').insert(data).select().single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este telefone já está cadastrado para outro cliente.');
    }
    throw error;
  }
  return newClient;
};

/** Atualiza dados de um cliente. Trata violação de unique constraint no telefone. */
export const updateClient = async (
  id: string,
  data: { name: string; phone: string; email?: string }
) => {
  const { error } = await supabase.from('clients').update(data).eq('id', id);

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este telefone já está cadastrado para outro cliente.');
    }
    throw error;
  }
};

/** Atualiza as notas de um cliente. */
export const updateClientNotes = async (id: string, notes: string) => {
  const { error } = await supabase.from('clients').update({ notes }).eq('id', id);

  if (error) throw error;
};

/** Alterna o status de mensalista de um cliente. */
export const toggleClientMensalista = async (
  id: string,
  isMensalista: boolean,
  planId?: string | null,
  expiresAt?: string | null
) => {
  const { error } = await supabase
    .from('clients')
    .update({
      is_mensalista: isMensalista,
      mensalista_plan_id: isMensalista ? planId || null : null,
      mensalista_expires_at: isMensalista ? expiresAt || null : null,
    })
    .eq('id', id);

  if (error) throw error;
};

/** Busca um cliente pelo número de telefone (com rate limiting server-side). */
export const getClientByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const { data, error } = await supabase.rpc('lookup_client_by_phone_rate_limited', {
    p_phone: cleanPhone,
  });

  if (error) throw error;
  return data;
};
