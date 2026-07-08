import { supabase } from '../supabase';

/** Busca todos os clientes cadastrados, ordenados por nome. Exclui soft-deletados. */
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .not('name', 'in', '("CLIENTE EXCLUIDO","BLOQUEADO")')
    .not('phone', 'like', 'DELETED_%')
    .not('phone', 'eq', '00000000000')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

/** Soft-deleta todos os clientes e exclui seus agendamentos. */
export const deleteAllClients = async (): Promise<number> => {
  const { error: bookingError } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (bookingError) throw bookingError;

  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .not('name', 'in', '("BLOQUEADO","CLIENTE EXCLUIDO")')
    .neq('phone', '00000000000');
  if (fetchError) throw fetchError;
  if (!clients || clients.length === 0) return 0;

  await Promise.all(
    clients.map((client) =>
      supabase
        .from('clients')
        .update({ name: 'CLIENTE EXCLUIDO', phone: `DELETED_${client.id}` })
        .eq('id', client.id)
    )
  );

  return clients.length;
};

/** Soft-deleta um cliente substituindo nome e telefone. */
export const deleteClient = async (id: string) => {
  const deletedPhone = `DELETED_${id}`;
  const { error } = await supabase
    .from('clients')
    .update({ name: 'CLIENTE EXCLUIDO', phone: deletedPhone })
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

/** Atualiza dados de um cliente. Verifica se o telefone não pertence a outro cliente. */
export const updateClient = async (
  id: string,
  data: { name: string; phone: string; email?: string }
) => {
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', data.phone)
    .neq('id', id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error('Este telefone já está cadastrado para outro cliente.');
  }

  const { error } = await supabase.from('clients').update(data).eq('id', id);

  if (error) throw error;
};

/** Atualiza as notas de um cliente. */
export const updateClientNotes = async (id: string, notes: string) => {
  const { error } = await supabase.from('clients').update({ notes }).eq('id', id);

  if (error) throw error;
};

/** Alterna o status de favorito de um cliente. */
export const toggleClientFavorite = async (id: string, isFavorite: boolean) => {
  const { error } = await supabase.from('clients').update({ is_favorite: isFavorite }).eq('id', id);

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

/** Busca um cliente pelo número de telefone. */
export const getClientByPhone = async (phone: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, is_mensalista, mensalista_plan_id')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};
