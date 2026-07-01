import { supabase } from './supabase';
import type { Service, Booking } from '../types';

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
  return data.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
};

// Bookings

/** Cria um agendamento via RPC, criando o cliente automaticamente se necessário. Valida campos obrigatórios no client-side. */
export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'created_at' | 'status' | 'client_id'>,
  clientData: { name: string; phone: string; email?: string }
) => {
  // Client-side validation before hitting the RPC
  if (!clientData.name.trim()) throw new Error('Informe seu nome.');
  if (clientData.phone.replace(/\D/g, '').length < 10) throw new Error('Informe um telefone válido com DDD.');
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
    p_duracao_total: bookingData.total_duration
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
    p_date: date
  });
  if (error) throw error;
  return (data || []).map((item: { slot_time: string }) => (item?.slot_time ?? '').slice(0, 5)).filter(Boolean);
};

/** Busca agendamentos, opcionalmente filtrados por data. Retorna bookings com dados do cliente. */
export const getBookings = async (date?: string) => {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      clients (
        name,
        phone
      )
    `)
    .order('booking_time', { ascending: true });

  if (date) {
    query = query.eq('booking_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/** Atualiza o status de um agendamento (confirmed, completed, cancelled, pending). */
export const updateBookingStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'pending') => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
  
  if (error) throw error;
};

/** Exclui permanentemente um agendamento pelo ID. */
export const deleteBooking = async (id: string) => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/** Alterna o bloqueio de um horário específico via RPC. */
export const toggleSlotBlock = async (date: string, time: string) => {
  const { data, error } = await supabase.rpc('toggle_slot_block', {
    p_date: date,
    p_time: time
  });
  if (error) throw error;
  return data;
};

/** Desbloqueia todos os horários de um dia via RPC. */
export const unblockDay = async (date: string) => {
  const { error } = await supabase.rpc('unblock_day', {
    p_date: date
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

  // Use Intl to get the current time in the user's local timezone,
  // consistent with how booking times are interpreted (local business hours).
  const nowStr = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date());
  const [nowH, nowM] = nowStr.split(':').map(Number);
  const currentTimeMinutes = nowH * 60 + nowM;

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

/** Busca todos os clientes cadastrados, ordenados por nome. */
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
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
    .gte('created_at', '1970-01-01')
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
    .gte('created_at', '1970-01-01');
  if (bookingError) throw bookingError;

  // Then soft-delete all real clients (each with unique phone using their own ID)
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .not('name', 'in', '("BLOQUEADO","CLIENTE EXCLUIDO")')
    .neq('phone', '00000000000');
  if (fetchError) throw fetchError;
  if (!clients || clients.length === 0) return 0;

  for (const client of clients) {
    const { error } = await supabase
      .from('clients')
      .update({ name: 'CLIENTE EXCLUIDO', phone: `DELETED_${client.id}` })
      .eq('id', client.id);
    if (error) throw error;
  }

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

/** Cria um novo cliente. Verifica duplicidade de telefone antes de inserir. */
export const createClient = async (data: { name: string; phone: string; email?: string; notes?: string; manually_added?: boolean }) => {
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', data.phone)
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error('Este telefone já está cadastrado para outro cliente.');
  }

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return newClient;
};

/** Atualiza dados de um cliente. Verifica se o telefone não pertence a outro cliente. */
export const updateClient = async (id: string, data: { name: string; phone: string; email?: string }) => {
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

  const { error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

/** Atualiza as notas de um cliente. */
export const updateClientNotes = async (id: string, notes: string) => {
  const { error } = await supabase
    .from('clients')
    .update({ notes })
    .eq('id', id);

  if (error) throw error;
};

/** Alterna o status de favorito de um cliente. */
export const toggleClientFavorite = async (id: string, isFavorite: boolean) => {
  const { error } = await supabase
    .from('clients')
    .update({ is_favorite: isFavorite })
    .eq('id', id);

  if (error) throw error;
};

/** Alterna o status de mensalista de um cliente. */
export const toggleClientMensalista = async (id: string, isMensalista: boolean) => {
  const { error } = await supabase
    .from('clients')
    .update({ is_mensalista: isMensalista })
    .eq('id', id);

  if (error) throw error;
};

/** Busca um cliente pelo número de telefone. */
export const getClientByPhone = async (phone: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, is_mensalista')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Reviews

/** Submete uma avaliação (1-5 estrelas) para um agendamento. */
export const submitReview = async (bookingId: string, clientId: string, rating: number, comment?: string) => {
  if (rating < 1 || rating > 5) throw new Error('Avaliação deve ser entre 1 e 5');
  const { error } = await supabase
    .from('reviews')
    .insert({ booking_id: bookingId, client_id: clientId, rating, comment: comment || null });

  if (error) throw error;
};

/** Retorna a média e total de avaliações via RPC. */
export const getAverageRating = async () => {
  const { data, error } = await supabase.rpc('get_average_rating');
  if (error) throw error;
  if (!data) return { average: 0, total: 0 };
  return data as { average: number; total: number };
};

/** Retorna as melhores avaliações para exibição no slider. */
export const getTopReviews = async (limit = 10) => {
  const { data, error } = await supabase.rpc('get_top_reviews', { p_limit: limit });
  if (error) throw error;
  return data || [];
};

// Expenses

/** Busca despesas, opcionalmente filtradas por mês (formato YYYY-MM). */
export const getExpenses = async (month?: string) => {
  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (month) {
    query = query.gte('expense_date', `${month}-01`).lt('expense_date', `${month}-32`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/** Cria uma nova despesa variável. */
export const createExpense = async (data: { description: string; amount: number; expense_date: string; category: string }) => {
  const { data: newExpense, error } = await supabase
    .from('expenses')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return newExpense;
};

/** Exclui uma despesa pelo ID. */
export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
};

// Recurring Expenses

/** Busca despesas recorrentes (ex: internet, streaming) via RPC. */
export const getRecurringExpenses = async () => {
  const { data, error } = await supabase.rpc('get_recurring_expenses');
  if (error) throw error;
  return data || [];
};

/** Cria uma nova despesa recorrente. */
export const createRecurringExpense = async (data: { description: string; amount: number; day_of_month: number; category: string }) => {
  const { data: newExpense, error } = await supabase
    .from('recurring_expenses')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return newExpense;
};

/** Exclui uma despesa recorrente pelo ID. */
export const deleteRecurringExpense = async (id: string) => {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
  if (error) throw error;
};

/** Cria automaticamente despesas recorrentes para um mês/ano específico. */
export const autoCreateRecurringExpenses = async (year: number, month: number) => {
  const { data, error } = await supabase.rpc('auto_create_recurring_expenses', { p_year: year, p_month: month });
  if (error) throw error;
  return data || [];
};

// Fixed Expenses (Aluguel, etc)

/** Busca despesas fixas ativas (aluguel, condomínio, etc). */
export const getFixedExpenses = async () => {
  const { data, error } = await supabase.from('fixed_expenses').select('*').eq('active', true).order('category');
  if (error) throw error;
  return data || [];
};

/** Atualiza o valor de uma despesa fixa. */
export const updateFixedExpense = async (id: string, amount: number) => {
  const { error } = await supabase.from('fixed_expenses').update({ amount }).eq('id', id);
  if (error) throw error;
};


