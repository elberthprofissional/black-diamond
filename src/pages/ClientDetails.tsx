import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClients, getBookings, deleteClient, updateClient, updateClientNotes } from '../lib/api';
import type { Client, Booking } from '../types';
import { formatPhone } from '../lib/utils';
import AdminNavbar from '../components/Admin/Navbar';
import AdminSidebar from '../components/Admin/AdminSidebar';
import BottomTabs from '../components/Admin/BottomTabs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Pencil } from 'lucide-react';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [templates, setTemplates] = useState<string[]>(() => {
    const saved = localStorage.getItem('barber_reminder_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookings()]);
      const foundClient = clientsData.find((c: Client) => c.id === id);
      if (!foundClient) { navigate('/admin/clients'); return; }
      setClient(foundClient);
      setNotesText(foundClient.notes || '');
      const clientBookings = bookingsData
        .filter((b: Booking) => b.client_id === id)
        .sort((a: Booking, b: Booking) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
      setHistory(clientBookings);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSendMessage = () => { if (client?.phone) window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank'); };
  const sendWithTemplate = (template: string) => {
    if (!client?.phone) return;
    const message = template.replace(/{nome}/gi, client.name.split(' ')[0]);
    window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    setIsReminderOpen(false);
  };
  const saveTemplate = () => { if (!newTemplate.trim()) return; const updated = [newTemplate.trim(), ...templates]; setTemplates(updated); localStorage.setItem('barber_reminder_templates', JSON.stringify(updated)); setNewTemplate(''); setIsCreatingTemplate(false); };
  const deleteTemplate = (index: number) => { const updated = templates.filter((_, i) => i !== index); setTemplates(updated); localStorage.setItem('barber_reminder_templates', JSON.stringify(updated)); };
  const openEdit = () => { if (!client) return; setEditName(client.name); setEditPhone(client.phone); setIsEditing(true); };
  const handleSaveEdit = async () => { if (!id || !editName.trim() || !editPhone.trim()) return; setSaving(true); try { await updateClient(id, { name: editName.trim(), phone: editPhone.trim() }); setClient((prev) => prev ? { ...prev, name: editName.trim(), phone: editPhone.trim() } : prev); setIsEditing(false); } catch { alert('Erro ao salvar.'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!id) return; setIsDeleting(true); try { await deleteClient(id); navigate('/admin/clients'); } catch { alert('Erro ao excluir.'); } finally { setIsDeleting(false); } };
  const handleSaveNotes = async () => { if (!id) return; setSavingNotes(true); try { await updateClientNotes(id, notesText.trim()); setClient(prev => prev ? { ...prev, notes: notesText.trim() } : prev); } catch { alert('Erro ao salvar.'); } finally { setSavingNotes(false); } };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" /></div>;
  if (!client) return null;

  const totalSpent = history.reduce((sum, b) => sum + Number(b.total_price), 0);
  const lastVisit = history.length > 0 ? new Date(history[0].booking_date) : null;

  return (
    <div className="min-h-[100dvh] lg:min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#C5A059]/30 flex overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 lg:ml-[320px] flex flex-col min-h-[100dvh] lg:h-screen overflow-hidden">
        <AdminNavbar />
        <main className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-12 pt-22 lg:pt-8 pb-28 lg:pb-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/[0.04]">
              <button onClick={() => navigate('/admin/clients')} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0">
                <ArrowLeft size={15} />
              </button>
              <div className="w-12 h-12 bg-[#C5A059]/10 border border-[#C5A059]/20 rounded-xl flex items-center justify-center text-base font-bold text-[#C5A059] shrink-0">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{client.name}</h1>
                <p className="text-xs text-zinc-500">{formatPhone(client.phone)}</p>
              </div>
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest hidden sm:block">
                Desde {new Date(client.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => navigate(`/admin/cliente/${id}/visitas`)} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-center hover:bg-white/[0.05] transition-all cursor-pointer">
                <p className="text-xl font-bold text-white">{history.length}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Visitas</p>
              </button>
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">R$ {totalSpent.toFixed(0)}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Total</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-white uppercase">{lastVisit ? lastVisit.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Nunca'}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Última Visita</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button onClick={handleSendMessage} className="flex-1 h-10 bg-[#C5A059] hover:bg-[#A68233] text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
              <button onClick={() => setIsReminderOpen(true)} className="flex-1 h-10 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.98] cursor-pointer">
                Lembrete
              </button>
              <button onClick={openEdit} className="h-10 px-4 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5">
                <Pencil size={12} className="text-zinc-500" />
                Editar
              </button>
              <button onClick={() => setIsDeleteOpen(true)} className="h-10 px-4 bg-red-500/[0.04] border border-red-500/[0.08] hover:bg-red-500/[0.08] text-red-500/70 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5">
                <Trash2 size={12} />
              </button>
            </div>

            {/* Notes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059]">Anotações</h2>
                <button
                  onClick={() => { if (isEditingNotes) { setIsEditingNotes(false); setNotesText(client.notes || ''); } else { setIsEditingNotes(true); } }}
                  className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {isEditingNotes ? 'Cancelar' : notesText.trim() ? 'Editar' : '+ Adicionar'}
                </button>
              </div>

              {notesText.trim() ? (
                <div className="space-y-2 pl-3 border-l border-[#C5A059]/20">
                  {notesText.split('\n').map((line, idx) => (
                    <p key={idx} className="text-xs text-zinc-300 leading-relaxed">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 italic">Nenhuma anotação.</p>
              )}

              <AnimatePresence>
                {isEditingNotes && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Ex: Prefere degradê baixo..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#C5A059]/30 resize-none h-20"
                      autoFocus
                    />
                    <button onClick={async () => { await handleSaveNotes(); setIsEditingNotes(false); }} disabled={savingNotes} className="w-full py-2 bg-[#C5A059] text-black text-[9px] font-bold uppercase tracking-wider rounded-lg cursor-pointer active:scale-95 transition-all">
                      {savingNotes ? '...' : 'Salvar'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </main>
      </div>

      <BottomTabs />

      {/* REMINDER MODAL */}
      <AnimatePresence>
        {isReminderOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsReminderOpen(false); setIsCreatingTemplate(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Enviar Lembrete</h3>
                  <button onClick={() => { setIsReminderOpen(false); setIsCreatingTemplate(false); }} className="text-zinc-600 hover:text-white transition-colors cursor-pointer">✕</button>
                </div>
                {!isCreatingTemplate ? (
                  <div className="space-y-2">
                    {templates.length === 0 ? (
                      <div className="py-6 text-center border border-dashed border-white/[0.06] rounded-xl">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Nenhum lembrete</p>
                      </div>
                    ) : templates.map((template, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer" onClick={() => sendWithTemplate(template)}>
                        <p className="flex-1 text-[11px] text-zinc-300 leading-relaxed line-clamp-2">{template.replace(/{nome}/g, client?.name?.split(' ')[0] || '{nome}')}</p>
                        <button onClick={(e) => { e.stopPropagation(); deleteTemplate(index); }} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => setIsCreatingTemplate(true)} className="w-full py-3 mt-2 border border-dashed border-white/[0.06] rounded-xl text-[11px] font-semibold text-zinc-500 hover:text-[#C5A059] hover:border-[#C5A059]/30 transition-all cursor-pointer">
                      + Criar lembrete
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-zinc-500">Use <span className="text-[#C5A059] font-semibold">{'{nome}'}</span> para o nome.</p>
                    <textarea value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} placeholder="Fala {nome}! Bora agendar..." className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#C5A059]/50 resize-none h-20 placeholder:text-zinc-700" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsCreatingTemplate(false); setNewTemplate(''); }} className="flex-1 py-2.5 text-zinc-500 font-semibold text-xs hover:text-white transition-all cursor-pointer">Cancelar</button>
                      <button onClick={saveTemplate} disabled={!newTemplate.trim()} className="flex-1 py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded-lg hover:bg-[#A68233] transition-all disabled:opacity-30 cursor-pointer">Salvar</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0A0A0A] border border-white/10 w-full max-w-sm relative z-10 rounded-2xl shadow-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Editar Cliente</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Nome</span>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors" />
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">WhatsApp</span>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#C5A059]/35 transition-colors tabular-nums" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveEdit} disabled={saving || !editName.trim() || !editPhone.trim()} className="flex-1 py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded-lg hover:bg-[#A68233] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer">{saving ? '...' : 'Salvar'}</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 text-zinc-500 font-semibold text-xs hover:text-white transition-all cursor-pointer">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {isDeleteOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeleting && setIsDeleteOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative z-10 w-full sm:max-w-xs bg-[#111] border-t sm:border border-white/[0.06] sm:rounded-2xl rounded-t-2xl p-4 space-y-3">
              <p className="text-xs text-zinc-400">Excluir <span className="text-white font-semibold">{client?.name}</span>? Não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setIsDeleteOpen(false)} disabled={isDeleting} className="flex-1 h-9 bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[9px] font-bold uppercase tracking-wider rounded-lg cursor-pointer">Manter</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-9 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase tracking-wider rounded-lg cursor-pointer">{isDeleting ? '...' : 'Excluir'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default ClientDetails;
