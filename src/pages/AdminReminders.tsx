import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getClients, getBookings } from '../lib/api';
import { formatPhone } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import type { Client, Booking } from '../types';

const AdminReminders: React.FC = () => {
  const navigate = useNavigate();
  const { toast, showSuccess, showError } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom templates stored in localStorage
  const [selectedTemplateType, setSelectedTemplateType] = useState<'tuesday' | 'thursday' | 'custom'>(() => {
    const today = new Date().getDay(); // 0 is Sunday, 2 is Tuesday, 4 is Thursday
    if (today === 4 || today === 5) return 'thursday';
    return 'tuesday';
  });

  const defaultTemplates = {
    tuesday: "E aí, {nome}! Beleza? 💈 Passando para lembrar de garantir seu horário para essa semana no Black Diamond. Não deixe para a última hora! Agende aqui: {link}",
    thursday: "Fala, {nome}! O fim de semana está chegando e a agenda está lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horário: {link}",
    custom: "Olá, {nome}! Tudo bem? Passando para lembrar de agendar seu horário conosco esta semana no Black Diamond! 💈 Garanta seu corte aqui: {link}"
  };

  const [tuesdayTemplate, setTuesdayTemplate] = useState(() => 
    localStorage.getItem('barber_reminder_tmpl_tuesday') || defaultTemplates.tuesday
  );
  const [thursdayTemplate, setThursdayTemplate] = useState(() => 
    localStorage.getItem('barber_reminder_tmpl_thursday') || defaultTemplates.thursday
  );
  const [customTemplate, setCustomTemplate] = useState(() => 
    localStorage.getItem('barber_reminder_tmpl_custom') || defaultTemplates.custom
  );

  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingText, setEditingText] = useState('');

  // Track sent reminders for today
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [sentMap, setSentMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`barber_reminders_sent_${todayStr}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Mobile navigation index for active card queue
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);

  // Filter settings
  const [hideSentToday, setHideSentToday] = useState(true);

  // Load clients and bookings
  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookings()]);
      
      // Filter out block lists or incomplete phone numbers
      const validClients = (clientsData || []).filter(
        (c: Client) => c && c.name && c.name !== 'BLOQUEADO' && c.phone && c.phone !== '00000000000'
      );
      
      setClients(validClients);
      setBookings(bookingsData || []);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update localStorage when sent map changes
  const markAsSent = (clientId: string) => {
    const updated = { ...sentMap, [clientId]: true };
    setSentMap(updated);
    localStorage.setItem(`barber_reminders_sent_${todayStr}`, JSON.stringify(updated));
  };

  // Get active template text
  const activeTemplateText = useMemo(() => {
    if (selectedTemplateType === 'tuesday') return tuesdayTemplate;
    if (selectedTemplateType === 'thursday') return thursdayTemplate;
    return customTemplate;
  }, [selectedTemplateType, tuesdayTemplate, thursdayTemplate, customTemplate]);

  // Handle saving the edited template
  const handleSaveTemplate = () => {
    if (selectedTemplateType === 'tuesday') {
      setTuesdayTemplate(editingText);
      localStorage.setItem('barber_reminder_tmpl_tuesday', editingText);
    } else if (selectedTemplateType === 'thursday') {
      setThursdayTemplate(editingText);
      localStorage.setItem('barber_reminder_tmpl_thursday', editingText);
    } else {
      setCustomTemplate(editingText);
      localStorage.setItem('barber_reminder_tmpl_custom', editingText);
    }
    setIsEditingTemplate(false);
    showSuccess('Modelo de mensagem salvo com sucesso!');
  };

  // Get booking link (defaults to current domain + /agendar)
  const bookingLink = useMemo(() => {
    return `${window.location.origin}/agendar`;
  }, []);

  // Format message text with client name and booking link
  const formatMessage = useCallback((text: string, clientName: string) => {
    const firstName = clientName.split(' ')[0];
    let formatted = text;
    formatted = formatted.replace(/{nome}/gi, firstName);
    formatted = formatted.replace(/{link}/gi, bookingLink);
    return formatted;
  }, [bookingLink]);

  // Determine which clients are eligible for reminders (i.e., do not have upcoming confirmed/pending appointments)
  const eligibleClients = useMemo(() => {
    // Find all clients that have at least one booking that is confirmed or pending and scheduled for today or in the future
    const todayISO = new Date();
    todayISO.setHours(0, 0, 0, 0);

    const clientIdsWithUpcomingBooking = new Set<string>();
    
    bookings.forEach((booking) => {
      if (booking.status !== 'cancelled') {
        const bookingDate = new Date(booking.booking_date + 'T00:00:00');
        if (bookingDate >= todayISO) {
          clientIdsWithUpcomingBooking.add(booking.client_id);
        }
      }
    });

    // Enriched client list with last visit info
    return clients
      .filter((c) => !clientIdsWithUpcomingBooking.has(c.id))
      .map((client) => {
        // Find last visit
        const clientBookings = bookings
          .filter((b) => b.client_id === client.id && b.status === 'completed')
          .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
        
        const lastVisitStr = clientBookings.length > 0 
          ? new Date(clientBookings[0].booking_date).toLocaleDateString('pt-BR')
          : 'Nunca';

        return {
          ...client,
          lastVisit: lastVisitStr,
          isSentToday: !!sentMap[client.id]
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, bookings, sentMap]);

  // Filter clients by search term and hideSentToday setting
  const filteredQueue = useMemo(() => {
    return eligibleClients.filter((client) => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        client.phone.includes(searchTerm);
      
      const matchesSentFilter = !hideSentToday || !client.isSentToday;
      
      return matchesSearch && matchesSentFilter;
    });
  }, [eligibleClients, searchTerm, hideSentToday]);

  // Statistics
  const stats = useMemo(() => {
    const totalEligible = eligibleClients.length;
    const sentTodayCount = eligibleClients.filter(c => c.isSentToday).length;
    const pendingCount = totalEligible - sentTodayCount;
    const percentage = totalEligible > 0 ? Math.round((sentTodayCount / totalEligible) * 100) : 0;

    return {
      totalEligible,
      sentTodayCount,
      pendingCount,
      percentage
    };
  }, [eligibleClients]);

  // Reset activeQueueIndex if queue size changes
  useEffect(() => {
    if (activeQueueIndex >= filteredQueue.length && filteredQueue.length > 0) {
      setActiveQueueIndex(filteredQueue.length - 1);
    }
  }, [filteredQueue.length, activeQueueIndex]);

  // Send WhatsApp reminder
  const sendWhatsApp = (clientId: string, clientName: string, clientPhone: string) => {
    const message = formatMessage(activeTemplateText, clientName);
    
    // Format phone
    let formattedPhone = clientPhone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    markAsSent(clientId);
    showSuccess(`Lembrete enviado para ${clientName.split(' ')[0]}!`);
  };

  // Next in queue (for mobile wizard)
  const handleNext = () => {
    if (activeQueueIndex < filteredQueue.length - 1) {
      setActiveQueueIndex(prev => prev + 1);
    } else {
      setActiveQueueIndex(0);
    }
  };

  // Prev in queue (for mobile wizard)
  const handlePrev = () => {
    if (activeQueueIndex > 0) {
      setActiveQueueIndex(prev => prev - 1);
    } else {
      setActiveQueueIndex(filteredQueue.length - 1);
    }
  };

  return (
    <AdminLayout
      mainClassName="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 pb-32 space-y-6"
    >
      {/* Toast Notification */}
      <ToastNotification toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin')} 
            className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1"
            aria-label="Voltar para Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Sparkles size={18} className="text-[#C5A059]" />
              Central de Lembretes
            </h1>
            <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest mt-0.5">
              Terças e Quintas • Fila Inteligente de Mensagens
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-center h-10 px-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-zinc-400 hover:text-white flex items-center gap-2 transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Sincronizar
        </button>
      </div>

      {/* Overview Cards & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-[#C5A059]/[0.02] rounded-full blur-2xl" />
          <div className="space-y-1 z-10">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Envios de Hoje</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.sentTodayCount}</span>
              <span className="text-zinc-600 text-sm">/ {stats.totalEligible} clientes</span>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 z-10">
            <div className="flex justify-between text-[10px] font-medium text-zinc-400">
              <span>Progresso</span>
              <span>{stats.percentage}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#C5A059] to-[#A68233] rounded-full transition-all duration-500" 
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Message Configuration Card */}
        <div className="md:col-span-2 bg-[#111] border border-white/[0.04] p-5 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="space-y-3 flex-1 w-full text-left">
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Modelo Selecionado</span>
              <div className="flex gap-1.5 mt-2">
                {(['tuesday', 'thursday', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedTemplateType(type);
                      setIsEditingTemplate(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      selectedTemplateType === type
                        ? 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059]'
                        : 'border-white/5 bg-white/[0.01] text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {type === 'tuesday' ? 'Terça-Feira' : type === 'thursday' ? 'Quinta-Feira' : 'Personalizado'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-black/30 border border-white/[0.02] p-3.5 rounded-xl min-h-[64px] flex flex-col justify-between">
              <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                "{formatMessage(activeTemplateText, 'Marcos')}"
              </p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.02]">
                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={10} />
                  Variáveis: {'{nome}'} e {'{link}'}
                </span>
                <button
                  onClick={() => {
                    setEditingText(activeTemplateText);
                    setIsEditingTemplate(true);
                  }}
                  className="text-[9px] font-bold text-[#C5A059] uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
                >
                  Editar Texto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Search */}
        <div className="flex-1 max-w-sm bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center focus-within:border-white/10 transition-all">
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou whatsapp..." 
            value={searchTerm} 
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setActiveQueueIndex(0);
            }} 
            className="w-full bg-transparent px-4 py-3 text-xs font-medium text-white outline-none placeholder:text-zinc-600 text-left" 
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="pr-3 text-zinc-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={hideSentToday}
              onChange={(e) => {
                setHideSentToday(e.target.checked);
                setActiveQueueIndex(0);
              }}
              className="w-3.5 h-3.5 rounded border-white/10 bg-white/[0.02] text-[#C5A059] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            Ocultar enviados hoje
          </label>
        </div>
      </div>

      {/* MAIN INTERFACE: SPLIT VIEW FOR DESKTOP, CAROUSEL WIZARD FOR MOBILE */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Carregando fila...</span>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-[#111] border border-white/[0.04] py-20 text-center flex flex-col items-center justify-center gap-3 rounded-2xl">
          <CheckCircle2 size={36} className="text-emerald-500/80" />
          <h3 className="text-base font-bold text-white">Tudo Pronto por Hoje!</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            {searchTerm 
              ? "Nenhum cliente atende a esses filtros de pesquisa."
              : "Todos os clientes sem agendamento já receberam o lembrete de hoje ou não há clientes pendentes."}
          </p>
          {hideSentToday && eligibleClients.some(c => c.isSentToday) && (
            <button
              onClick={() => setHideSentToday(false)}
              className="mt-2 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:underline cursor-pointer"
            >
              Visualizar contatos enviados hoje
            </button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW */}
          <div className="hidden lg:grid grid-cols-5 gap-6 items-start">
            {/* Left Column: Template & Flow guide */}
            <div className="col-span-2 space-y-4 text-left">
              <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl space-y-4">
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em] block">
                  Como funciona a Fila?
                </span>
                
                <ol className="space-y-3.5 text-xs text-zinc-400">
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/[0.04] text-[10px] font-black text-white flex items-center justify-center shrink-0">1</span>
                    <span>Clique em <strong className="text-white">Enviar no WhatsApp</strong> ao lado do cliente desejado.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/[0.04] text-[10px] font-black text-white flex items-center justify-center shrink-0">2</span>
                    <span>O sistema abrirá a conversa pré-preenchida no WhatsApp Web ou App.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/[0.04] text-[10px] font-black text-white flex items-center justify-center shrink-0">3</span>
                    <span>Envie a mensagem e volte para esta guia. O cliente mudará para <span className="text-emerald-500 font-semibold">Enviado (✓)</span> e sairá da fila.</span>
                  </li>
                </ol>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.03] flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    <strong>Papo de segurança:</strong> Esse método garante 100% de gratuidade e evita bloqueios de spam no chip da barbearia, já que cada envio parte diretamente da sua conta humana.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Queue */}
            <div className="col-span-3 bg-[#111] border border-white/[0.04] rounded-2xl overflow-hidden text-left">
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Fila de Clientes ({filteredQueue.length})
                </span>
                <span className="text-[9px] text-zinc-600 font-bold uppercase">
                  Sem agendamento futuro
                </span>
              </div>

              <div className="divide-y divide-white/[0.02] max-h-[500px] overflow-y-auto scrollbar-hide">
                <AnimatePresence initial={false}>
                  {filteredQueue.map((client) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all group"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white uppercase tracking-tight truncate">
                            {client.name}
                          </p>
                          {client.isSentToday && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                              Enviado hoje
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                          <span className="font-mono">{formatPhone(client.phone)}</span>
                          <span className="text-zinc-700">•</span>
                          <span>Último corte: <strong className="text-zinc-400">{client.lastVisit}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {client.isSentToday ? (
                          <button
                            onClick={() => sendWhatsApp(client.id, client.name, client.phone)}
                            className="h-9 px-3.5 rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-bold uppercase tracking-wider bg-emerald-500/[0.02]"
                          >
                            Reenviar
                          </button>
                        ) : (
                          <button
                            onClick={() => sendWhatsApp(client.id, client.name, client.phone)}
                            className="h-9 px-3.5 rounded-lg bg-[#C5A059] hover:bg-[#A68233] text-black flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider active:scale-[0.98]"
                          >
                            <Send size={10} strokeWidth={2.5} />
                            Enviar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* MOBILE WIZARD (CAROUSEL) */}
          <div className="lg:hidden w-full flex flex-col gap-4 text-center">
            {/* Pagination count */}
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Fila de Envio • {activeQueueIndex + 1} de {filteredQueue.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-lg bg-[#161618] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  &larr;
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-lg bg-[#161618] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  &rarr;
                </button>
              </div>
            </div>

            {/* Active Card */}
            <div className="relative overflow-hidden w-full min-h-[220px] bg-[#111112] border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#C5A059]/[0.01] rounded-full blur-3xl pointer-events-none" />

              {/* Client Info */}
              <div className="space-y-4 text-left">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-center text-lg font-bold text-[#C5A059] uppercase">
                    {filteredQueue[activeQueueIndex]?.name.charAt(0)}
                  </div>
                  {filteredQueue[activeQueueIndex]?.isSentToday && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                      Lembrado hoje
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight truncate">
                    {filteredQueue[activeQueueIndex]?.name}
                  </h2>
                  <p className="text-xs font-mono text-zinc-500">
                    {filteredQueue[activeQueueIndex] && formatPhone(filteredQueue[activeQueueIndex].phone)}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.03] flex justify-between text-[11px]">
                  <span className="text-zinc-500">Última Visita</span>
                  <span className="font-bold text-zinc-300 uppercase">
                    {filteredQueue[activeQueueIndex]?.lastVisit}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-white/[0.03]">
                {filteredQueue[activeQueueIndex]?.isSentToday ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendWhatsApp(
                        filteredQueue[activeQueueIndex].id,
                        filteredQueue[activeQueueIndex].name,
                        filteredQueue[activeQueueIndex].phone
                      )}
                      className="flex-1 h-12 rounded-xl bg-transparent border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    >
                      Reenviar Mensagem
                    </button>
                    <button
                      onClick={handleNext}
                      className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer active:scale-95 transition-transform"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      sendWhatsApp(
                        filteredQueue[activeQueueIndex].id,
                        filteredQueue[activeQueueIndex].name,
                        filteredQueue[activeQueueIndex].phone
                      );
                      // Advance automatically after 1 second to give user visual feedback
                      setTimeout(() => {
                        handleNext();
                      }, 800);
                    }}
                    className="w-full h-12 rounded-xl bg-[#C5A059] hover:bg-[#A68233] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-[0_4px_20px_rgba(197,160,89,0.15)]"
                  >
                    <Send size={13} strokeWidth={2.5} />
                    Enviar Lembrete
                  </button>
                )}
              </div>
            </div>
            
            {/* Quick Actions (Skip / Settings toggle) */}
            <div className="flex justify-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
              <button 
                onClick={handlePrev}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-zinc-800">|</span>
              <button 
                onClick={handleNext}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Pular Cliente
              </button>
            </div>
          </div>
        </>
      )}

      {/* TEMPLATE EDIT MODAL */}
      <AnimatePresence>
        {isEditingTemplate && (
          <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditingTemplate(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: '100%', opacity: 0 }} 
              transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
              className="relative z-10 w-full sm:w-[420px] bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl overflow-hidden p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em] block">Configuração</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Editar Modelo de Mensagem</h3>
                </div>
                <button 
                  onClick={() => setIsEditingTemplate(false)} 
                  className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Variáveis Disponíveis
                  </label>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] font-mono text-zinc-400">
                      {`{nome}`} - Primeiro Nome
                    </span>
                    <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] font-mono text-zinc-400">
                      {`{link}`} - Link de Agendamento
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Mensagem do Modelo
                  </label>
                  <textarea
                    rows={5}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-xs text-zinc-200 outline-none focus:border-[#C5A059]/30 transition-all resize-none leading-relaxed text-left"
                    placeholder="Escreva sua mensagem..."
                  />
                </div>
              </div>

              <div className="flex border-t border-white/[0.04] mt-5 -mx-6 -mb-6">
                <button 
                  onClick={() => setIsEditingTemplate(false)} 
                  className="flex-1 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <div className="w-px bg-white/[0.04]" />
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!editingText.trim()}
                  className="flex-1 py-4 text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hover:bg-[#C5A059]/10 transition-all cursor-pointer text-center disabled:opacity-30"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminReminders;
