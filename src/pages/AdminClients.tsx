import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getClients, getBookings, getBookingsForStats, deleteClient, updateClient, updateClientNotes, createClient, toggleClientMensalista } from '../lib/api';
import { formatPhone, getErrorMessage } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import ClientPanel from '../components/Admin/shared/ClientPanel';
import DeleteClientModal from '../components/Admin/shared/DeleteClientModal';
import EditClientModal from '../components/Admin/shared/EditClientModal';
import NewClientModal from '../components/Admin/shared/NewClientModal';
import ReminderModal from '../components/Admin/shared/ReminderModal';
import { ArrowLeft, Search, ChevronRight, Plus } from 'lucide-react';
import type { Client, ClientWithStats, BookingWithClient } from '../types';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast, showSuccess, showError } = useToast();
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [panelBookings, setPanelBookings] = useState<BookingWithClient[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [newClientError, setNewClientError] = useState('');
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [remindersSent, setRemindersSent] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('barber_reminders_sent');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [templates, setTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('barber_reminder_templates_v2');
      if (saved) return JSON.parse(saved);
      const siteUrl = window.location.origin;
      const initial = [
        `E aí! Beleza? 💈 Passando para lembrar de garantir seu horário para essa semana no Black Diamond. Não deixe para a última hora! Agende aqui: ${siteUrl}`,
        `Fala! O fim de semana está chegando e a agenda está lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horário: ${siteUrl}`,
        `Olá! Tudo bem? Passando para lembrar de agendar seu horário conosco esta semana no Black Diamond! 💈 Garanta seu corte aqui: ${siteUrl}`
      ];
      localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(initial));
      return initial;
    } catch { return []; }
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [reminderFilter, setReminderFilter] = useState<'all' | 'pending' | 'sent'>(
    (filterParam === 'pending' || filterParam === 'sent') ? filterParam : 'all'
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (filterParam === 'pending' || filterParam === 'sent') {
      setReminderFilter(filterParam);
    } else {
      setReminderFilter('all');
    }
  }, [filterParam]);

  const handleFilterChange = (filter: 'all' | 'pending' | 'sent') => {
    setReminderFilter(filter);
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const markReminderSent = (clientId: string) => {
    const updated = { ...remindersSent, [clientId]: new Date().toISOString() };
    setRemindersSent(updated);
    localStorage.setItem('barber_reminders_sent', JSON.stringify(updated));
  };

  const isReminderRecent = useCallback((clientId: string): boolean => {
    const lastSent = remindersSent[clientId];
    if (!lastSent) return false;
    const diff = Date.now() - new Date(lastSent).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }, [remindersSent]);

  const loadData = async () => {
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookingsForStats()]);
      const todayISO = new Date();
      todayISO.setHours(0, 0, 0, 0);

      const enriched: ClientWithStats[] = (clientsData || [])
        .filter((c: Client) => c && c.name && c.name !== 'BLOQUEADO' && c.name !== 'CLIENTE EXCLUIDO' && c.phone !== '00000000000' && !(c as unknown as Record<string, unknown>).is_blocked)
        .map((c: Client) => {
          const cb = (bookingsData || []).filter((b) => b && b.client_id === c.id && b.status !== 'cancelled');
          const upcoming = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate >= todayISO;
          }).sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())[0];
          const pastBookings = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate < todayISO;
          });
          const lb = [...pastBookings].sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())[0];

          return {
            ...c,
            lastVisit: lb ? new Date(lb.booking_date).toLocaleDateString('pt-BR') : 'Nunca',
            totalSpent: cb.reduce((s, b) => s + Number(b.total_price || 0), 0),
            bookingsCount: cb.length,
            upcomingBooking: upcoming ? {
              date: new Date(upcoming.booking_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              time: (upcoming.booking_time || '').slice(0, 5)
            } : null
          };
        })
        .filter((c) => c.bookingsCount >= 2 || c.manually_added);
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(enriched);
    } catch { /* ignored */ } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredClients = clients.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm);
    let matchFilter = true;
    if (reminderFilter === 'pending') {
      matchFilter = !isReminderRecent(c.id);
    } else if (reminderFilter === 'sent') {
      matchFilter = isReminderRecent(c.id);
    }
    return matchSearch && matchFilter;
  });

  const counts = useMemo(() => {
    let pending = 0;
    let sent = 0;
    clients.forEach(c => {
      if (isReminderRecent(c.id)) { sent++; } else { pending++; }
    });
    return { all: clients.length, pending, sent };
  }, [clients, isReminderRecent]);

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    setIsReminderOpen(false);
    try {
      const bookings = await getBookings();
      setPanelBookings(bookings.filter((b) => b.client_id === client.id).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()));
    } catch { setPanelBookings([]); }
  }, []);

  const closePanel = () => { setSelectedClient(null); setIsEditing(false); setIsEditingNotes(false); setIsReminderOpen(false); setIsDeleteOpen(false); };

  const handleSaveEdit = async () => {
    if (!selectedClient || !editName.trim() || !editPhone.trim()) return;
    setSaving(true);
    try {
      await updateClient(selectedClient.id, { name: editName.trim(), phone: editPhone.trim() });
      setSelectedClient((p) => p ? { ...p, name: editName.trim(), phone: editPhone.trim() } : p);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, name: editName.trim(), phone: editPhone.trim() } : c));
      setIsEditing(false);
    } catch (error) { showError(getErrorMessage(error)); } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try { await updateClientNotes(selectedClient.id, notesText.trim()); setSelectedClient((p) => p ? { ...p, notes: notesText.trim() } : p); } catch (error) { showError(getErrorMessage(error)); } finally { setSavingNotes(false); }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setNewClientError('');
    setIsSavingClient(true);
    try {
      const phone = newClientPhone.trim();
      const name = newClientName.trim();

      const { supabase } = await import('../lib/supabase');

      const { data: existingPhone } = await supabase
        .from('clients')
        .select('id, name, manually_added')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      if (existingPhone) {
        if (existingPhone.manually_added) {
          setNewClientError(`Este telefone já está cadastrado para "${existingPhone.name}".`);
          setIsSavingClient(false);
          return;
        }

        const { error: updateErr } = await supabase
          .from('clients')
          .update({ manually_added: true })
          .eq('id', existingPhone.id);

        if (updateErr) {
          setNewClientError(getErrorMessage(updateErr));
          setIsSavingClient(false);
          return;
        }

        setIsCreatingClient(false);
        setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); setNewClientError('');
        showSuccess(`${existingPhone.name} adicionado com sucesso!`);
        await loadData();
        setIsSavingClient(false);
        return;
      }

      const { data: existingName } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', name)
        .limit(1)
        .maybeSingle();

      if (existingName) {
        setNewClientError('Este nome já está sendo usado por outro cliente.');
        setIsSavingClient(false);
        return;
      }

      const created = await createClient({ name, phone, email: newClientEmail.trim() || undefined, notes: newClientNotes.trim() || undefined, manually_added: true });
      setClients(prev => [...prev, { ...created, lastVisit: 'Nunca', totalSpent: 0, bookingsCount: 0, upcomingBooking: null }].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setIsCreatingClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); setNewClientError('');
      showSuccess('Cliente criado com sucesso!');
    } catch (error) {
      setNewClientError(getErrorMessage(error));
    } finally { setIsSavingClient(false); }
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    try { await deleteClient(selectedClient.id); setClients(prev => prev.filter(c => c.id !== selectedClient.id)); closePanel(); showSuccess('Cliente excluído!'); } catch (error) { showError(getErrorMessage(error)); } finally { setIsDeleting(false); setIsDeleteOpen(false); }
  };

  const handleToggleMensalista = async () => {
    if (!selectedClient) return;
    try {
      const newValue = !selectedClient.is_mensalista;
      await toggleClientMensalista(selectedClient.id, newValue);
      setSelectedClient(prev => prev ? { ...prev, is_mensalista: newValue } : prev);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, is_mensalista: newValue } : c));
      showSuccess(newValue ? 'Cliente agora é mensalista!' : 'Mensalidade removida.');
    } catch (error) { showError(getErrorMessage(error)); }
  };

  const sendWithTemplate = (template: string) => {
    if (!selectedClient?.phone) return;
    let formattedPhone = selectedClient.phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) { formattedPhone = '55' + formattedPhone; }
    try {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(template)}`, '_blank');
    } catch {
      // popup bloqueado no mobile
    }
    markReminderSent(selectedClient.id);
    setIsReminderOpen(false);
  };

  const handleDeleteTemplate = (indexToDelete: number) => {
    const updated = templates.filter((_, idx) => idx !== indexToDelete);
    setTemplates(updated);
    localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(updated));
    showSuccess('Modelo de lembrete excluído!');
  };

  const handleSaveTemplate = (text: string) => {
    const updated = [text, ...templates];
    setTemplates(updated);
    localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(updated));
    showSuccess('Lembrete salvo nos modelos!');
  };

  const panelTotal = panelBookings.reduce((s, b) => s + Number(b.total_price), 0);
  const panelLast = panelBookings.length > 0 ? new Date(panelBookings[0].booking_date) : null;

  return (
    <AdminLayout mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-28 lg:pt-6 pb-40 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">Meus Clientes</h1>
            <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest mt-0.5">{clients.length} cadastrados</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center focus-within:border-white/10 transition-all overflow-hidden">
          <div className="pl-4 pr-3 shrink-0"><Search size={15} className="text-zinc-600" /></div>
          <input type="text" placeholder="Pesquisar contatos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent py-3.5 text-xs font-medium text-white outline-none placeholder:text-zinc-600 text-left overflow-hidden text-ellipsis" />
        </div>
        <button onClick={() => setIsCreatingClient(true)} className="h-[46px] px-4 rounded-xl bg-[#C5A059] hover:bg-[#A68233] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95">
          <Plus size={16} strokeWidth={2.5} className="text-black" />
          <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">Novo Cliente</span>
        </button>
      </div>

      <div className="flex gap-6 border-b border-white/[0.04] w-full select-none pb-0 mt-2">
        {(['all', 'pending', 'sent'] as const).map((filter) => {
          const active = reminderFilter === filter;
          const label = filter === 'all' ? 'Todos' : filter === 'pending' ? 'A Lembrar' : 'Lembrados';
          const count = filter === 'all' ? counts.all : filter === 'pending' ? counts.pending : counts.sent;
          return (
            <button key={filter} onClick={() => handleFilterChange(filter)} className="relative pb-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none">
              <span className={active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}>{label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${active ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'bg-white/5 text-zinc-500'}`}>{count}</span>
              {active && <motion.div layoutId="activeFilterTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            </button>
          );
        })}
      </div>

      <div>
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
            <span className="text-[10px] font-medium text-zinc-500">Carregando...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {searchTerm ? "Nenhum cliente atende a esses filtros de pesquisa." : reminderFilter === 'pending' ? "Todos os clientes já foram lembrados recentemente!" : reminderFilter === 'sent' ? "Nenhum lembrete enviado recentemente." : "Nenhum cliente cadastrado."}
            </p>
          </div>
        ) : (
          <>
            <div className="lg:hidden space-y-1">
              {filteredClients.map((client) => {
                const needsReminder = !isReminderRecent(client.id);
                return (
                <div key={client.id} onClick={() => openPanel(client)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPanel(client); }} aria-label={`Cliente ${client.name}, último corte: ${client.lastVisit}`} className={`w-full flex items-center gap-3 py-3.5 px-4 rounded-xl cursor-pointer border transition-all group text-left ${needsReminder ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03]'}`}>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white uppercase">{client.name.charAt(0)}</div>
                    {client.is_mensalista ? (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0A0A0A] bg-[#C5A059] flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>
                      </div>
                    ) : (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${needsReminder ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                      <span className="text-[11px] text-zinc-500 truncate">{formatPhone(client.phone)}</span>
                      <span className="text-zinc-600 shrink-0">•</span>
                      <span className="text-[10px] text-zinc-500 truncate">Último: {client.lastVisit}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {needsReminder && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setIsReminderOpen(true); }} className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08]">Lembrar</button>
                    )}
                    <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                  </div>
                </div>
              )})}
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-3">
              {filteredClients.map((client) => {
                const needsReminder = !isReminderRecent(client.id);
                return (
                <div key={client.id} onClick={() => openPanel(client)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPanel(client); }} aria-label={`Cliente ${client.name}, último corte: ${client.lastVisit}`} className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group text-left ${needsReminder ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08]' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'}`}>
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-center text-base font-bold text-white uppercase">{client.name.charAt(0)}</div>
                    {client.is_mensalista ? (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0A0A0A] bg-[#C5A059] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>
                      </div>
                    ) : (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] ${needsReminder ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{formatPhone(client.phone)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Último corte: <strong className="text-zinc-400">{client.lastVisit}</strong></span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {needsReminder && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setIsReminderOpen(true); }} className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08]">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Lembrar
                      </button>
                    )}
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                  </div>
                </div>
              )})}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedClient && (
          <ClientPanel
            client={selectedClient}
            panelBookings={panelBookings}
            panelTotal={panelTotal}
            panelLast={panelLast}
            notesText={notesText}
            isEditingNotes={isEditingNotes}
            savingNotes={savingNotes}
            onNotesChange={setNotesText}
            onToggleEditNotes={() => { if (isEditingNotes) { setIsEditingNotes(false); setNotesText(selectedClient.notes || ''); } else { setIsEditingNotes(true); } }}
            onSaveNotes={handleSaveNotes}
            onEdit={() => { setEditName(selectedClient.name); setEditPhone(selectedClient.phone); setIsEditing(true); }}
            onDelete={() => setIsDeleteOpen(true)}
            onReminder={() => setIsReminderOpen(true)}
            onClose={closePanel}
            onToggleMensalista={handleToggleMensalista}
          />
        )}
      </AnimatePresence>

      <DeleteClientModal
        isOpen={isDeleteOpen && !!selectedClient}
        clientName={selectedClient?.name || ''}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />

      <EditClientModal
        isOpen={isEditing && !!selectedClient}
        name={editName}
        phone={editPhone}
        saving={saving}
        onNameChange={setEditName}
        onPhoneChange={setEditPhone}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />

      <ReminderModal
        isOpen={isReminderOpen && !!selectedClient}
        clientName={selectedClient?.name || ''}
        templates={templates}
        onDeleteTemplate={handleDeleteTemplate}
        onSaveTemplate={handleSaveTemplate}
        onSendTemplate={sendWithTemplate}
        onClose={() => setIsReminderOpen(false)}
      />

      <NewClientModal
        isOpen={isCreatingClient}
        name={newClientName}
        phone={newClientPhone}
        notes={newClientNotes}
        saving={isSavingClient}
        error={newClientError}
        onNameChange={(v) => { setNewClientName(v); setNewClientError(''); }}
        onPhoneChange={(v) => { setNewClientPhone(v); setNewClientError(''); }}
        onNotesChange={setNewClientNotes}
        onSave={handleCreateClient}
        onCancel={() => { setIsCreatingClient(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); setNewClientError(''); }}
      />

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminClients;
