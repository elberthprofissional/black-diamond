import { supabase } from './supabase';
import type { Service, Booking, MensalistaPlan } from '../types';

// Services

/** Busca todos os serviços cadastrados, deduplicados por nome. */
export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  // Deduplicate by name
  const seen = new Set<string>();
  return data.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
};

/** Cria um novo serviço */
export const createService = async (service: { name: string; price: number }): Promise<boolean> => {
  const { error } = await supabase
    .from('services')
    .insert({ name: service.name, price: service.price, duration: 60 });

  return !error;
};

/** Atualiza um serviço existente */
export const updateService = async (
  id: string,
  data: { name?: string; price?: number }
): Promise<boolean> => {
  const { error } = await supabase.from('services').update(data).eq('id', id);

  return !error;
};

/** Remove um serviço */
export const deleteService = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('services').delete().eq('id', id);

  return !error;
};

// Bookings

/** Cria um agendamento via RPC, criando o cliente automaticamente se necessário. Valida campos obrigatórios no client-side. */
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'>,
  clientData: { name: string; phone: string; email?: string }
) => {
  // Client-side validation before hitting the RPC
  if (!clientData.name.trim()) throw new Error('Informe seu nome.');
  if (clientData.phone.replace(/\D/g, '').length < 11) {
    throw new Error('Informe um telefone válido com DDD.');
  }
  if (bookingData.service_ids.length === 0) throw new Error('Selecione pelo menos um serviço.');
  if (!bookingData.booking_date) throw new Error('Selecione uma data.');
  if (!bookingData.booking_time) throw new Error('Selecione um horário.');
  if (bookingData.total_price <= 0) throw new Error('O preço total deve ser maior que zero.');

  const { data, error } = await supabase.rpc('criar_agendamento', {
    p_cliente_nome: clientData.name.trim(),
    p_cliente_telefone: clientData.phone.replace(/\D/g, ''),
    p_cliente_email: clientData.email || null,
    p_servicos: bookingData.service_ids,
    p_data: bookingData.booking_date,
    p_hora: bookingData.booking_time,
    p_preco_total: bookingData.total_price,
    p_duracao_total: bookingData.total_duration,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('preenchido') || msg.includes('unique_violation')) {
      throw new Error('Este horário acabou de ser preenchido. Por favor, escolha outro.');
    }
    if (msg.toLowerCase().includes('limite de 3 agendamentos')) {
      throw new Error('Limite de 3 agendamentos por dia atingido para este telefone.');
    }
    throw new Error(msg || 'Erro ao criar agendamento. Tente novamente.');
  }

  return Array.isArray(data) ? data : [data];
};

/** Busca horários disponíveis para uma data via RPC, excluindo slots ocupados e bloqueados. */
export const getAvailableSlots = async (date: string) => {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: date,
  });
  if (error) throw error;
  return (data || [])
    .map((item: { slot_time: string }) => (item?.slot_time ?? '').slice(0, 5))
    .filter(Boolean);
};

/** Busca agendamentos, opcionalmente filtrados por data. Retorna bookings com dados do cliente. */
export const getBookings = async (date?: string) => {
  let query = supabase
    .from('bookings')
    .select(
      `
      *,
      clients (
        name,
        phone
      )
    `
    )
    .order('booking_time', { ascending: true });

  if (date) {
    query = query.eq('booking_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/** Atualiza o status de um agendamento (confirmed, completed, cancelled, pending). */
export const updateBookingStatus = async (
  id: string,
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending'
) => {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);

  if (error) throw error;
};

/** Exclui permanentemente um agendamento pelo ID. */
export const deleteBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').delete().eq('id', id);

  if (error) throw error;
};

/** Busca agendamentos futuros pelo telefone do cliente (para cancelamento público). */
export const getBookingsByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, booking_date, booking_time, status, total_price, service_ids, total_duration, clients!inner(name, phone)'
    )
    .gte('booking_date', today)
    .in('status', ['pending', 'confirmed'])
    .eq('clients.phone', cleanPhone)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

/** Cancela um agendamento (status → cancelled). */
export const cancelBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
};

/** Alterna o bloqueio de um horário específico via RPC. */
export const toggleSlotBlock = async (date: string, time: string) => {
  const { data, error } = await supabase.rpc('toggle_slot_block', {
    p_date: date,
    p_time: time,
  });
  if (error) throw error;
  return data;
};

/** Desbloqueia todos os horários de um dia via RPC. */
export const unblockDay = async (date: string) => {
  const { error } = await supabase.rpc('unblock_day', {
    p_date: date,
  });
  if (error) throw error;
};

/** Marca como concluídos os agendamentos cujo horário já passou. Retorna a quantidade de bookings atualizados. */
export const autoCompleteExpiredBookings = async (date: string): Promise<number> => {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_time, total_duration, status')
    .eq('booking_date', date)
    .in('status', ['confirmed', 'pending'])
    .eq('is_blocked', false);

  if (error || !bookings || bookings.length === 0) return 0;

  // Use explicit São Paulo timezone (UTC-3) for accurate comparison
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  const [h, m] = formatter.format(now).split(':').map(Number);
  const currentTimeMinutes = h * 60 + m;

  const expiredIds: string[] = [];

  for (const booking of bookings) {
    const [hours, minutes] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const bookingEndMinutes = hours * 60 + minutes + (booking.total_duration || 60);

    if (currentTimeMinutes >= bookingEndMinutes) {
      expiredIds.push(booking.id);
    }
  }

  if (expiredIds.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .in('id', expiredIds);

  if (updateError) return 0;
  return expiredIds.length;
};

/** Busca todos os bookings (sem filtro de data) para cálculo de estatísticas. */
export const getBookingsForStats = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_id, booking_date, booking_time, total_price, status')
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Clients

/** Busca todos os clientes cadastrados, ordenados por nome. Exclui clientes soft-deletados. */
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

// Data reset

/** Marca todos os agendamentos ativos como concluídos (usado no reset de dados). */
export const completeAllActiveBookings = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .in('status', ['confirmed', 'pending'])
    .eq('is_blocked', false)
    .select('id');
  if (error) throw error;
  return data?.length || 0;
};

/** Exclui todos os agendamentos permanentemente. */
export const deleteAllBookings = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');
  if (error) throw error;
  return data?.length || 0;
};

/** Soft-deleta todos os clientes (substitui nome/telefone) e exclui seus agendamentos. */
export const deleteAllClients = async (): Promise<number> => {
  // First delete all bookings to avoid FK issues
  const { error: bookingError } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (bookingError) throw bookingError;

  // Then soft-delete all real clients (phone UNIQUE requires per-row updates)
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
/** Soft-deleta um cliente substituindo nome e telefone (mantém integridade referencial). */
export const deleteClient = async (id: string) => {
  // Use the client's own UUID in the deleted phone to guarantee uniqueness,
  // even under concurrent deletes (phone has a UNIQUE constraint).
  const deletedPhone = `DELETED_${id}`;
  const { error } = await supabase
    .from('clients')
    .update({ name: 'CLIENTE EXCLUIDO', phone: deletedPhone })
    .eq('id', id);

  if (error) throw error;
};

/** Cria um novo cliente. Trata violação de unique constraint no banco. */
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
      // unique_violation
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

/** Alterna o status de mensalista de um cliente, opcionalmente vinculando a um plano e data de expiração. */
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

// Mensalista Plans

/** Busca todos os planos mensalistas (admin: todos, público: apenas ativos). */
export const getMensalistaPlans = async (activeOnly = false): Promise<MensalistaPlan[]> => {
  let query = supabase
    .from('mensalista_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MensalistaPlan[];
};

/** Cria um novo plano mensalista. */
export const createMensalistaPlan = async (plan: {
  name: string;
  price: number;
  included_service_ids: string[];
  is_active?: boolean;
}): Promise<MensalistaPlan> => {
  const { data, error } = await supabase
    .from('mensalista_plans')
    .insert({
      name: plan.name,
      price: plan.price,
      included_service_ids: plan.included_service_ids,
      is_active: plan.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MensalistaPlan;
};

/** Atualiza um plano mensalista. */
export const updateMensalistaPlan = async (
  id: string,
  data: {
    name?: string;
    price?: number;
    included_service_ids?: string[];
    is_active?: boolean;
    sort_order?: number;
  }
): Promise<void> => {
  const { error } = await supabase.from('mensalista_plans').update(data).eq('id', id);
  if (error) throw error;
};

/** Exclui um plano mensalista. */
export const deleteMensalistaPlan = async (id: string): Promise<void> => {
  const { error } = await supabase.from('mensalista_plans').delete().eq('id', id);
  if (error) throw error;
};

/** Alterna o status ativo/inativo de um plano mensalista. */
export const toggleMensalistaPlan = async (id: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase
    .from('mensalista_plans')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
};

/** Busca a configuração de mensalista ativo/desativo. */
export const getMensalistaEnabled = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'mensalista_enabled')
    .maybeSingle();
  if (error) throw error;
  return data?.value === 'true';
};

/** Atualiza a configuração de mensalista ativo/desativo. */
export const setMensalistaEnabled = async (enabled: boolean): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'mensalista_enabled', value: String(enabled) }, { onConflict: 'key' });
  if (error) throw error;
};

// Booking Management (public)

export interface ManagedBooking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  total_duration: number;
  service_names: string[];
  client_name: string;
  client_phone: string;
  is_expired: boolean;
}

/** Busca agendamentos por token de gerenciamento (acesso público). */
export const getBookingsByToken = async (token: string): Promise<ManagedBooking[]> => {
  const { data, error } = await supabase.rpc('get_bookings_by_token', {
    p_token: token,
  });

  if (error) throw error;
  return (data || []) as ManagedBooking[];
};

// Reviews
