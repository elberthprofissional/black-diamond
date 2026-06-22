import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getClients, getBookings, deleteClient, updateClient, updateClientNotes, createClient } from '../lib/api';
import { formatPhone } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { ArrowLeft, Search, ChevronRight, User, Trash2, Pencil, X, Plus } from 'lucide-react';
import type { Client, ClientWithStats, BookingWithClient } from '../types';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingClient, setDeletingClient] = useState<ClientWithStats | null>(null);
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
  const [smartSuggestion, setSmartSuggestion] = useState('');
  const [templates, setTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('barber_reminder_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [reminderFilter, setReminderFilter] = useState<'all' | 'pending'>('all');
  const navigate = useNavigate();

  const getSmartSuggestion = (clientName: string): string => {
    const firstName = clientName.split(' ')[0];
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    if (month === 11 && day >= 15 && day <= 25) {
      return `Feliz Natal, ${firstName}! 🎄 Aproveite o Natal pra se arrumar! Temos horários disponíveis esta semana. Bora agendar?`;
    }
    if (month === 1 && day >= 1 && day <= 10) {
      return `Feliz Ano Novo, ${firstName}! 🎆 Comece o ano bem resolvido! Vamos agendar seu corte?`;
    }
    if (month === 1 && day >= 20 && day <= 28) {
      return `E aí, ${firstName}! Carnaval tá chegando! 🎭 Bora deixar o visual afiado? Temos horários essa semana!`;
    }
    if (month === 2 && day >= 1 && day <= 10) {
      return `Férias de Carnaval, ${firstName}! 🎉 Aproveita pra cuidar do visual. Vamos agendar?`;
    }
    if (month === 3 && day >= 1 && day <= 15) {
      return `Páscoa, ${firstName}! 🐰 Aproveita o feriado pra se arrumar! Horários disponíveis esta semana.`;
    }
    if (month === 8 && day >= 1 && day <= 10) {
      return `Patriota, ${firstName}! 🇧🇷 Dia da Pátria! Vamos agendar um corte especial?`;
    }
    if (month === 9 && day >= 25 && day <= 31) {
      return `Dia das Crianças, ${firstName}! 👶 Leve o pequeno pra cortar também! Horários disponíveis.`;
    }
    if (month === 10 && day >= 15 && day <= 30) {
      return `Black Friday, ${firstName}! 💰 Aproveite pra agendar com antecedência. Vamos marcar?`;
    }
    if (month === 4 && day >= 8 && day <= 12) {
      return `Dia das Mães, ${firstName}! 👩 Agende-se pra ficar impecável! Horários disponíveis.`;
    }
    if (month === 5 && day >= 8 && day <= 15) {
      return `Dia dos Namorados, ${firstName}! ❤️ Fique no ponto pra data! Bora agendar?`;
    }
    if (month === 10 && day >= 1 && day <= 10) {
      return `Dia dos Pais, ${firstName}! 👨 Venha com o pai agendar! Horários disponíveis.`;
    }

    return `Temos horários disponíveis esta semana! Bora agendar?`;
  };

  const markReminderSent = (clientId: string) => {
    const updated = { ...remindersSent, [clientId]: new Date().toISOString() };
    setRemindersSent(updated);
    localStorage.setItem('barber_reminders_sent', JSON.stringify(updated));
  };

  const isReminderRecent = (clientId: string): boolean => {
    const lastSent = remindersSent[clientId];
    if (!lastSent) return false;
    const diff = Date.now() - new Date(lastSent).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const loadData = async () => {
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookings()]);
      const enriched: ClientWithStats[] = (clientsData || [])
        .filter((c: Client) => c && c.name && c.name !== 'BLOQUEADO' && c.phone !== '00000000000')
        .map((c: Client) => {
          const cb = (bookingsData || []).filter((b) => b && b.client_id === c.id && b.status !== 'cancelled');
          const lb = [...cb].sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())[0];
          return { 
            ...c, 
            lastVisit: lb ? new Date(lb.booking_date).toLocaleDateString('pt-BR') : 'Nunca', 
            totalSpent: cb.reduce((s, b) => s + Number(b.total_price || 0), 0), 
            bookingsCount: cb.length 
          };
        });
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(enriched);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
  }, []);

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchReminder = reminderFilter === 'all' || !isReminderRecent(c.id);
    return matchSearch && matchReminder;
  });

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    setIsReminderOpen(false);
    setSmartSuggestion(getSmartSuggestion(client.name));
    try {
      const bookings = await getBookings();
      setPanelBookings(bookings.filter((b) => b.client_id === client.id).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()));
    } catch { setPanelBookings([]); }
  }, [remindersSent]);

  const closePanel = () => { setSelectedClient(null); setIsEditing(false); setIsEditingNotes(false); setIsReminderOpen(false); setIsDeleteOpen(false); };

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
      setClients(prev => [...prev, { ...created, lastVisit: 'Nunca', totalSpent: 0, bookingsCount: 0 }].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setIsCreatingClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientNotes('');
      showSuccess('Cliente criado!');
    } catch { showError('Erro ao criar cliente.'); } finally { setIsSavingClient(false); }
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    try { await deleteClient(selectedClient.id); setClients(prev => prev.filter(c => c.id !== selectedClient.id)); closePanel(); showSuccess('Cliente excluído!'); } catch { showError('Erro ao excluir.'); } finally { setIsDeleting(false); setIsDeleteOpen(false); }
  };

  const formatReminder = (templateText: string, clientName: string) => {
    const firstName = clientName.split(' ')[0];
    if (/{nome}/gi.test(templateText)) {
      return templateText.replace(/{nome}/gi, firstName);
    }
    return `${firstName}, ${templateText}`;
  };

  const sendWithTemplate = (template: string) => {
    if (!selectedClient?.phone) return;
    const formattedText = formatReminder(template, selectedClient.name);
    window.open(`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(formattedText)}`, '_blank');
    markReminderSent(selectedClient.id);
    setIsReminderOpen(false);
  };

  const saveTemplate = () => { if (!newTemplate.trim()) return; const u = [newTemplate.trim(), ...templates]; setTemplates(u); localStorage.setItem('barber_reminder_templates', JSON.stringify(u)); setNewTemplate(''); setIsCreatingTemplate(false); };

  const panelTotal = panelBookings.reduce((s, b) => s + Number(b.total_price), 0);
  const panelLast = panelBookings.length > 0 ? new Date(panelBookings[0].booking_date) : null;

  return (
    <AdminLayout
      mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-28 lg:pt-6 pb-40 space-y-5"
    >
          
          {/* Header */}
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.04]">
            <button onClick={() => navigate('/admin')} className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Meus Clientes</h1>
              <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest mt-0.5">{clients.length} cadastrados</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center focus-within:border-white/10 transition-all">
              <div className="pl-4 pr-3"><Search size={15} className="text-zinc-600" /></div>
              <input type="text" placeholder="Pesquisar contatos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent py-3.5 text-xs font-medium text-white outline-none placeholder:text-zinc-600" />
            </div>
            <button onClick={() => setIsCreatingClient(true)} className="h-[46px] px-4 rounded-xl bg-[#C5A059] hover:bg-[#A68233] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95">
              <Plus size={16} strokeWidth={2.5} className="text-black" />
              <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">Novo Cliente</span>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            <button onClick={() => setReminderFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${reminderFilter === 'all' ? 'bg-white/[0.06] text-white' : 'text-zinc-600'}`}>
              Todos
            </button>
            <button onClick={() => setReminderFilter('pending')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${reminderFilter === 'pending' ? 'bg-white/[0.06] text-white' : 'text-zinc-600'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Pendentes
            </button>
          </div>

          {/* Client List */}
          <div>
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
                <span className="text-[10px] font-medium text-zinc-500">Carregando...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center gap-3">
                <User size={28} className="text-zinc-800" />
                <p className="text-zinc-600 text-sm font-medium">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <>
                {/* Mobile: list */}
                <div className="lg:hidden space-y-1">
                  {filteredClients.map((client) => (
                    <div key={client.id} onClick={() => openPanel(client)} className="flex items-center gap-4 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all group">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${isReminderRecent(client.id) ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{client.phone}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-700 shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Desktop: cards */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {filteredClients.map((client) => (
                    <div key={client.id} onClick={() => openPanel(client)} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-center text-base font-bold text-white uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] ${isReminderRecent(client.id) ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{client.phone}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-2">Membro desde {new Date(client.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
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
                  <div className="w-12 h-12 bg-[#111111] border border-black rounded-xl flex items-center justify-center text-lg font-bold text-zinc-500 uppercase shrink-0">
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
                  <button 
                    onClick={() => setIsReminderOpen(true)} 
                    className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Enviar Lembrete
                  </button>
                  <a 
                    href={`https://wa.me/55${selectedClient.phone?.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 h-10 border border-white/[0.06] bg-white/[0.02] text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar Mensagem
                  </a>
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
                    <div className="space-y-1.5 pl-3 border-l border-[#C5A059]/20 my-2">
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

      {/* DELETE LIST MODAL */}
      <AnimatePresence>
        {deletingClient && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingClient(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:max-w-sm bg-[#161618] sm:rounded-2xl rounded-t-2xl p-6 space-y-5">
              <div className="flex justify-center"><div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400"><Trash2 size={20} /></div></div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">Excluir Cliente</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">Tem certeza? Os agendamentos de <span className="text-white font-semibold">{deletingClient.name}</span> também serão removidos.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { try { await deleteClient(deletingClient.id); setDeletingClient(null); loadData(); showSuccess('Cliente excluído!'); } catch { showError('Erro ao excluir.'); } }} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer">Excluir</button>
                <button onClick={() => setDeletingClient(null)} className="flex-1 h-11 bg-white/[0.04] border border-white/[0.06] text-zinc-300 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/[0.07] transition-all cursor-pointer">Cancelar</button>
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
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Email <span className="text-zinc-700">(opcional)</span></span>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700" />
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

      {/* REMINDER MODAL */}
      <AnimatePresence>
        {isReminderOpen && selectedClient && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsReminderOpen(false); setIsCreatingTemplate(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative z-10 w-full sm:w-[380px] bg-[#111111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[85dvh] flex flex-col">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/[0.04] shrink-0">
                <div>
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.25em] block">Enviar Lembrete</span>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedClient.name}</p>
                </div>
                <button onClick={() => { setIsReminderOpen(false); setIsCreatingTemplate(false); }} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white transition-colors cursor-pointer">
                  <X size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {!isCreatingTemplate ? (
                  <>
                    {/* Suggestion card */}
                    {smartSuggestion && (
                      <div onClick={() => sendWithTemplate(smartSuggestion)} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-[#C5A059]/20 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Enviar lembrete</span>
                        </div>
                        <p className="text-[12px] text-zinc-300 leading-relaxed line-clamp-2">{formatReminder(smartSuggestion, selectedClient.name)}</p>
                        <div className="flex items-center gap-1.5 mt-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="#C5A059"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          <span className="text-[9px] font-bold text-[#C5A059] uppercase tracking-wider">Enviar pelo WhatsApp</span>
                        </div>
                      </div>
                    )}

                    {/* Create custom reminder */}
                    <div onClick={() => setIsCreatingTemplate(true)} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] border-dashed cursor-pointer hover:border-white/[0.1] transition-all">
                      <span className="text-[11px] font-semibold text-zinc-500">Criar lembrete personalizado</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-left">
                    <p className="text-[10px] text-zinc-500 font-bold">Use {'{nome}'} para incluir o primeiro nome do cliente automaticamente.</p>
                    <textarea value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} placeholder="Ex: {nome}! Bora agendar seu corte pra esta semana?..." className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#C5A059]/50 resize-none h-24 placeholder:text-zinc-700" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsCreatingTemplate(false); setNewTemplate(''); }} className="flex-1 py-2.5 text-zinc-500 font-semibold text-xs hover:text-white transition-all cursor-pointer">Cancelar</button>
                      <button onClick={saveTemplate} disabled={!newTemplate.trim()} className="flex-1 py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded-xl hover:bg-[#A68233] transition-all disabled:opacity-30 cursor-pointer">Salvar</button>
                    </div>
                  </div>
                )}
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
              <div className="px-6 pt-6 pb-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em]">Novo cliente</span>
                  <button onClick={() => { setIsCreatingClient(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientNotes(''); }} className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome</span>
                    <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nome do cliente" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700" autoFocus />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">WhatsApp</span>
                    <input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="00000000000" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 tabular-nums" />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Email <span className="text-zinc-700">(opcional)</span></span>
                    <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700" />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Anotações <span className="text-zinc-700">(opcional)</span></span>
                    <textarea value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} placeholder="Ex: Prefere degradê baixo..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors placeholder:text-zinc-700 resize-none h-16" />
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
