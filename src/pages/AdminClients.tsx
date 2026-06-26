import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getClients, getBookings, deleteClient, updateClient, updateClientNotes, createClient } from '../lib/api';
import { formatPhone } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { 
  ArrowLeft, 
  Search, 
  ChevronRight, 
  ChevronDown,
  Trash2, 
  Pencil, 
  X, 
  Plus
} from 'lucide-react';
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
  const [editEmail, setEditEmail] = useState('');
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
      const initial = [
        "E aí! Beleza? 💈 Passando para lembrar de garantir seu horário para essa semana no Black Diamond. Não deixe para a última hora! Agende aqui: https://black-diamond-wheat.vercel.app/",
        "Fala! O fim de semana está chegando e a agenda está lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horário: https://black-diamond-wheat.vercel.app/",
        "Olá! Tudo bem? Passando para lembrar de agendar seu horário conosco esta semana no Black Diamond! 💈 Garanta seu corte aqui: https://black-diamond-wheat.vercel.app/"
      ];
      localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(initial));
      return initial;
    } catch {
      return [];
    }
  });
  const [customReminderText, setCustomReminderText] = useState('');
  const [reminderMode, setReminderMode] = useState<'list' | 'create'>('list');
  const [expandedTemplateIdx, setExpandedTemplateIdx] = useState<number | null>(null);





  // URL search params mapping for filters
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
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookings()]);
      
      const todayISO = new Date();
      todayISO.setHours(0, 0, 0, 0);

      const enriched: ClientWithStats[] = (clientsData || [])
        .filter((c: Client) => c && c.name && c.name !== 'BLOQUEADO' && c.phone !== '00000000000' && !('is_blocked' in c))
        .map((c: Client) => {
          const cb = (bookingsData || []).filter((b) => b && b.client_id === c.id && b.status !== 'cancelled');
          
          // Find upcoming bookings (today or future)
          const upcoming = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate >= todayISO;
          }).sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())[0];

          // Past bookings (to find last visit)
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
        });
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(enriched);
    } catch { /* ignored */ } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClients = clients.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm);

    let matchFilter = true;
    if (reminderFilter === 'pending') {
      matchFilter = !c.upcomingBooking && !isReminderRecent(c.id);
    } else if (reminderFilter === 'sent') {
      matchFilter = !!c.upcomingBooking || isReminderRecent(c.id);
    }

    return matchSearch && matchFilter;
  });

  const counts = useMemo(() => {
    let pending = 0;
    let sent = 0;

    clients.forEach(c => {
      if (c.upcomingBooking || isReminderRecent(c.id)) {
        sent++;
      } else {
        pending++;
      }
    });

    return {
      all: clients.length,
      pending,
      sent
    };
  }, [clients, isReminderRecent]);

  const closeReminderModal = useCallback(() => {
    setIsReminderOpen(false);
    setCustomReminderText('');
    setReminderMode('list');
    setExpandedTemplateIdx(null);
  }, []);

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    closeReminderModal();
    try {
      const bookings = await getBookings();
      setPanelBookings(bookings.filter((b) => b.client_id === client.id).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()));
    } catch { setPanelBookings([]); }
  }, [closeReminderModal]);

  const closePanel = () => { setSelectedClient(null); setIsEditing(false); setIsEditingNotes(false); closeReminderModal(); setIsDeleteOpen(false); };

  const handleSaveEdit = async () => {
    if (!selectedClient || !editName.trim() || !editPhone.trim()) return;
    setSaving(true);
    try {
      await updateClient(selectedClient.id, { name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim() || undefined });
      setSelectedClient((p) => p ? { ...p, name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim() || undefined } : p);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, name: editName.trim(), phone: editPhone.trim() } : c));
      setIsEditing(false);
    } catch { showError('Erro ao salvar.'); } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try { await updateClientNotes(selectedClient.id, notesText.trim()); setSelectedClient((p) => p ? { ...p, notes: notesText.trim() } : p); } catch { showError('Erro ao salvar.'); } finally { setSavingNotes(false); }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setIsSavingClient(true);
    try {
      const created = await createClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim() || undefined, notes: newClientNotes.trim() || undefined });
      setClients(prev => [...prev, { ...created, lastVisit: 'Nunca', totalSpent: 0, bookingsCount: 0, upcomingBooking: null }].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setIsCreatingClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientNotes('');
      showSuccess('Cliente criado!');
      loadData();
    } catch { showError('Erro ao criar cliente.'); } finally { setIsSavingClient(false); }
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    try { await deleteClient(selectedClient.id); setClients(prev => prev.filter(c => c.id !== selectedClient.id)); closePanel(); showSuccess('Cliente excluído!'); } catch { showError('Erro ao excluir.'); } finally { setIsDeleting(false); setIsDeleteOpen(false); }
  };

  // Reminder message formatting
  const formatReminder = useCallback((templateText: string) => {
    return templateText;
  }, []);

  const sendWithTemplate = (template: string) => {
    if (!selectedClient?.phone) return;
    const formattedText = formatReminder(template);
    
    let formattedPhone = selectedClient.phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(formattedText)}`, '_blank');
    markReminderSent(selectedClient.id);
    closeReminderModal();
  };

  const deleteTemplate = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter((_, idx) => idx !== indexToDelete);
    setTemplates(updated);
    localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(updated));
    showSuccess('Modelo de lembrete excluído!');
  };

  const saveCustomTemplate = () => {
    if (!customReminderText.trim()) return;
    const text = customReminderText.trim();
    const updated = [text, ...templates];
    setTemplates(updated);
    localStorage.setItem('barber_reminder_templates_v2', JSON.stringify(updated));
    setCustomReminderText('');
    showSuccess('Lembrete salvo nos modelos!');
  };

  const sendCustomReminderDirectly = () => {
    if (!customReminderText.trim()) return;
    sendWithTemplate(customReminderText.trim());
    setCustomReminderText('');
  };

  const panelTotal = panelBookings.reduce((s, b) => s + Number(b.total_price), 0);
  const panelLast = panelBookings.length > 0 ? new Date(panelBookings[0].booking_date) : null;

  return (
    <AdminLayout
      mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-28 lg:pt-6 pb-40 space-y-5"
    >
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/admin')} className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Meus Clientes
                </h1>
                <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest mt-0.5">{clients.length} cadastrados</p>
              </div>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center focus-within:border-white/10 transition-all">
              <div className="pl-4 pr-3"><Search size={15} className="text-zinc-600" /></div>
              <input type="text" placeholder="Pesquisar contatos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent py-3.5 text-xs font-medium text-white outline-none placeholder:text-zinc-600 text-left" />
            </div>
            <button onClick={() => setIsCreatingClient(true)} className="h-[46px] px-4 rounded-xl bg-[#C5A059] hover:bg-[#A68233] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95">
              <Plus size={16} strokeWidth={2.5} className="text-black" />
              <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">Novo Cliente</span>
            </button>
          </div>



          {/* Filter tabs */}
          <div className="flex gap-6 border-b border-white/[0.04] w-full select-none pb-0 mt-2">
            {(['all', 'pending', 'sent'] as const).map((filter) => {
              const active = reminderFilter === filter;
              const label = filter === 'all' ? 'Todos' : filter === 'pending' ? 'A Lembrar' : 'Lembrados';
              const count = filter === 'all' ? counts.all : filter === 'pending' ? counts.pending : counts.sent;
              
              return (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className="relative pb-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none"
                >
                  <span className={active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}>
                    {label}
                  </span>
                  
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                    active 
                      ? 'bg-[#C5A059]/15 text-[#C5A059]' 
                      : 'bg-white/5 text-zinc-500'
                  }`}>
                    {count}
                  </span>
                  
                  {active && (
                    <motion.div 
                      layoutId="activeFilterTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Client List */}
          <div>
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
                <span className="text-[10px] font-medium text-zinc-500">Carregando...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  {searchTerm 
                    ? "Nenhum cliente atende a esses filtros de pesquisa."
                    : reminderFilter === 'pending'
                      ? "Todos os clientes já receberam lembrete recentemente ou já possuem agendamento!"
                      : reminderFilter === 'sent'
                        ? "Nenhum lembrete enviado recentemente."
                        : "Nenhum cliente cadastrado."}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: list */}
                <div className="lg:hidden space-y-1">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => openPanel(client)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPanel(client); }}
                      aria-label={`Cliente ${client.name}, último corte: ${client.lastVisit}`}
                      className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl cursor-pointer bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] transition-all group text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${
                          client.upcomingBooking || isReminderRecent(client.id)
                            ? 'bg-emerald-500' 
                            : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-zinc-500">{formatPhone(client.phone)}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[10px] text-zinc-500">Último: {client.lastVisit}</span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-2">
                        {!client.upcomingBooking && !isReminderRecent(client.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                              setIsReminderOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 bg-[#C5A059] hover:bg-[#A68233] text-black"
                          >
                            Lembrar
                          </button>
                        )}
                        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: cards */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => openPanel(client)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPanel(client); }}
                      aria-label={`Cliente ${client.name}, último corte: ${client.lastVisit}`}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-center text-base font-bold text-white uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] ${
                          client.upcomingBooking || isReminderRecent(client.id)
                            ? 'bg-emerald-500' 
                            : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{formatPhone(client.phone)}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Último corte: <strong className="text-zinc-400">{client.lastVisit}</strong></span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-3">
                        {!client.upcomingBooking && !isReminderRecent(client.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                              setIsReminderOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer bg-[#C5A059] hover:bg-[#A68233] text-black shadow-[0_2px_10px_rgba(197,160,89,0.1)]"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Lembrar
                          </button>
                        )}
                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

      {/* CLIENT PANEL */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-[200] flex justify-end flex-col sm:flex-row">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full sm:w-[440px] h-[100dvh] sm:h-full mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border-t-0 sm:border-l border-[#C5A059]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-left"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={closePanel} 
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em]">Dados do Cliente</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setEditName(selectedClient.name); setEditPhone(selectedClient.phone); setEditEmail(selectedClient.email || ''); setIsEditing(true); }} 
                    className="text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => setIsDeleteOpen(true)} 
                    className="text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6 flex-1">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                  <div className="w-12 h-12 bg-[#111111] border border-white/[0.08] rounded-xl flex items-center justify-center text-lg font-bold text-white uppercase shrink-0">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-white uppercase tracking-tight truncate">{selectedClient.name}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{formatPhone(selectedClient.phone)}</p>
                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Membro desde {new Date(selectedClient.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* Stats Container */}
                <div className="bg-[#121212] border border-white/[0.03] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center px-2 py-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total de Visitas</span>
                    <span className="text-sm font-black text-[#C5A059]">
                      {panelBookings.length} {panelBookings.length === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valor Faturado</span>
                    <span className="text-sm font-black text-white">R$ {panelTotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/[0.04] px-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Última Visita</span>
                    <span className="text-xs font-bold text-white uppercase">
                      {panelLast ? panelLast.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a 
                    href={`https://wa.me/55${selectedClient.phone?.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar pelo WhatsApp
                  </a>
                  <button 
                    onClick={() => { setIsReminderOpen(true); }} 
                    className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Enviar Lembrete
                  </button>
                </div>

                {/* Notes */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Anotações</h3>
                    <button onClick={() => { if (isEditingNotes) { setIsEditingNotes(false); setNotesText(selectedClient.notes || ''); } else { setIsEditingNotes(true); } }} className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer">
                      {isEditingNotes ? 'Cancelar' : notesText.trim() ? 'Editar' : '+ Adicionar'}
                    </button>
                  </div>

                  {notesText.trim() ? (
                    <div className="space-y-1.5 pl-3 border-l border-[#C5A059]/20 my-2 text-left">
                      {notesText.split('\n').map((line, idx) => (
                        <p key={idx} className="text-xs text-zinc-300 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  ) : !isEditingNotes ? (
                    <p className="text-[10px] text-zinc-600 italic">Nenhuma anotação registrada.</p>
                  ) : null}

                  <AnimatePresence>
                    {isEditingNotes && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                        <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Ex: Prefere degradê baixo..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#C5A059]/30 resize-none h-20" autoFocus />
                        <button onClick={async () => { await handleSaveNotes(); setIsEditingNotes(false); }} disabled={savingNotes} className="w-full py-2.5 bg-[#C5A059] text-black text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all">
                          {savingNotes ? '...' : 'Salvar'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE PANEL MODAL */}
      <AnimatePresence>
        {isDeleteOpen && selectedClient && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeleting && setIsDeleteOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative z-10 w-full sm:max-w-xs bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-5 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">Excluir <span className="text-white font-semibold">{selectedClient.name}</span>? Essa ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setIsDeleteOpen(false)} disabled={isDeleting} className="flex-1 h-10 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer">Manter</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer">{isDeleting ? '...' : 'Excluir'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditing && selectedClient && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 rounded-2xl shadow-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Editar Cliente</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome</span>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors" />
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">WhatsApp</span>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors tabular-nums" />
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Email <span className="text-zinc-500">(opcional)</span></span>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-zinc-500 font-semibold text-xs hover:text-white transition-all cursor-pointer">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving || !editName.trim() || !editPhone.trim()} className="flex-1 py-3 bg-[#C5A059] text-black font-semibold text-xs rounded-xl hover:bg-[#A68233] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer">{saving ? '...' : 'Salvar'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isReminderOpen && selectedClient && (
          <div className="fixed inset-0 z-[250] flex justify-end flex-col sm:flex-row">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={closeReminderModal} 
              className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
            />
            {/* Drawer Panel */}
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
              className="relative w-full sm:w-[440px] h-[100dvh] sm:h-full mt-auto sm:mt-0 bg-[#0E0E0E] border-t sm:border-t-0 sm:border-l border-[#C5A059]/20 shadow-2xl overflow-y-auto scrollbar-hide flex flex-col text-white"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0E0E0E]/95 backdrop-blur-md z-10 px-6 py-5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-3">
                  {reminderMode === 'create' && (
                    <button 
                      onClick={() => setReminderMode('list')}
                      className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                    </button>
                  )}
                  <div className="text-left">
                    <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">
                      {reminderMode === 'create' ? 'Mensagem Personalizada' : 'Enviar Lembrete'}
                    </span>
                    <p className="text-sm font-semibold text-zinc-100 mt-1">{selectedClient.name}</p>
                  </div>
                </div>
                <button 
                  onClick={closeReminderModal} 
                  className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-grow overflow-y-auto p-6 bg-[#0E0E0E]">
                <div className="w-full space-y-6 text-left">
                  
                  {reminderMode === 'list' ? (
                    <>
                      {/* Templates List */}
                      <div className="space-y-2 sm:space-y-3">
                        {/* Saved models at the top */}
                        {templates.map((templateText, index) => {
                          const isExpanded = expandedTemplateIdx === index;
                          return (
                            <div 
                              key={`template-card-${index}`}
                              onClick={() => setExpandedTemplateIdx(isExpanded ? null : index)}
                              className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left ${
                                isExpanded 
                                  ? 'bg-white/[0.04] border-white/20 shadow-lg' 
                                  : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Modelo #{index + 1}</span>
                                <ChevronDown size={14} className={`text-zinc-500 transition-transform sm:w-4 sm:h-4 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                              </div>
                              
                              <p className={`text-[11px] sm:text-xs text-zinc-400 leading-normal sm:leading-relaxed mt-2 sm:mt-3 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {templateText}
                              </p>

                              {isExpanded && (
                                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTemplate(index, e);
                                      if (expandedTemplateIdx === index) {
                                        setExpandedTemplateIdx(null);
                                      }
                                    }}
                                    className="text-zinc-500 hover:text-red-400 text-[9px] sm:text-xs font-bold uppercase flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={11} className="sm:w-3.5 sm:h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendWithTemplate(templateText);
                                    }}
                                    className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.04] text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95"
                                  >
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    <span>Enviar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button 
                        onClick={() => {
                          setCustomReminderText('');
                          setReminderMode('create');
                        }}
                        className="w-full py-4 border border-[#C5A059]/20 hover:border-[#C5A059]/40 bg-[#C5A059]/[0.02] text-[#C5A059] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#C5A059]/[0.05] active:scale-[0.98] transition-all cursor-pointer text-center"
                      >
                        + Escrever Personalizado
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Mode: Create/Edit Template */}
                      <div className="space-y-3 text-left">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Mensagem Personalizada</span>
                        <textarea 
                          value={customReminderText} 
                          onChange={(e) => setCustomReminderText(e.target.value)} 
                          placeholder="Escreva a mensagem de lembrete..." 
                          className="w-full bg-black/40 border border-white/[0.06] rounded-2xl px-5 py-4 text-sm text-zinc-200 outline-none focus:border-[#C5A059]/30 resize-none h-48 placeholder:text-zinc-700 leading-relaxed focus:bg-white/[0.01] transition-all" 
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button 
                          onClick={saveCustomTemplate} 
                          disabled={!customReminderText.trim() || templates.includes(customReminderText.trim())} 
                          className="w-full sm:flex-1 py-3 bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.08] text-zinc-400 disabled:opacity-20 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-[0.98]"
                        >
                          Salvar nos Modelos
                        </button>
                        <button 
                          onClick={sendCustomReminderDirectly} 
                          disabled={!customReminderText.trim()} 
                          className="w-full sm:flex-1 py-3 bg-[#C5A059] disabled:opacity-30 hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span>Enviar no WhatsApp</span>
                        </button>
                      </div>
                    </>
                  )}
                  
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW CLIENT MODAL */}
      <AnimatePresence>
        {isCreatingClient && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreatingClient(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:w-[340px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-5 text-left">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em]">Novo cliente</span>
                  <button onClick={() => { setIsCreatingClient(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); }} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome</span>
                    <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nome do cliente" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 text-left" autoFocus />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">WhatsApp</span>
                    <input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="00000000000" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 tabular-nums text-left" />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Email <span className="text-zinc-500">(opcional)</span></span>
                    <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-600 text-left" />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Anotações <span className="text-zinc-500">(opcional)</span></span>
                    <textarea value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} placeholder="Ex: Prefere degradê baixo..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-600 resize-none h-16 text-left" />
                  </div>
                </div>
              </div>
              <div className="flex border-t border-white/[0.04]">
                <button onClick={() => { setIsCreatingClient(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); }} className="flex-1 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer">Cancelar</button>
                <div className="w-px bg-white/[0.04]" />
                <button onClick={handleCreateClient} disabled={isSavingClient || !newClientName.trim() || !newClientPhone.trim()} className="flex-1 py-3.5 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-all cursor-pointer disabled:opacity-30">{isSavingClient ? '...' : 'Salvar'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Toast */}
      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminClients;
