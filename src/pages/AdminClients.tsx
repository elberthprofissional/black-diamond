import { useState, useMemo, lazy, Suspense, useEffect, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPhone } from '../lib/utils';
import { useClients } from '../hooks/useClients';
import ReminderFilterTabs from '../components/Admin/shared/ReminderFilterTabs';
import { useReminders } from '../hooks/useReminders';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import ClientPanel from '../components/Admin/shared/ClientPanel';
import DeleteClientModal from '../components/Admin/shared/DeleteClientModal';
import EditClientModal from '../components/Admin/shared/EditClientModal';
const NewClientModal = lazy(() => import('../components/Admin/shared/NewClientModal'));
const ReminderModal = lazy(() => import('../components/Admin/shared/ReminderModal'));
import { SkeletonClients } from '../components/Skeleton';
import { ArrowLeft, Search, ChevronRight, Plus, Bell, X } from 'lucide-react';
import ReminderClientList from '../components/Admin/shared/ReminderClientList';
import type { Client } from '../types';

// Avatar minimalista clean
const AVATAR_STYLE = 'bg-white/[0.06] border border-white/[0.08] text-zinc-300';

const AdminClients: FC = () => {
  const c = useClients();
  const r = useReminders();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  type ClientFilter = 'all' | 'pending' | 'sent';
  const [reminderFilter, setReminderFilter] = useState<ClientFilter>(
    filterParam === 'pending' || filterParam === 'sent' ? filterParam : 'all'
  );
  const [nowTimestamp] = useState(() => Date.now());
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderClient, setReminderClient] = useState<Client | null>(null);

  useEffect(() => {
    if (filterParam === 'pending' || filterParam === 'sent') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReminderFilter(filterParam);
    } else {
      setReminderFilter('all');
    }
  }, [filterParam]);

  const handleFilterChange = (filter: ClientFilter) => {
    setReminderFilter(filter);
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const filteredClients = c.clients.filter((cl) => {
    const nameToSearch = cl.name || '';
    const phoneToSearch = cl.phone || '';
    const matchSearch =
      nameToSearch.toLowerCase().includes(c.debouncedSearch.toLowerCase()) ||
      phoneToSearch.includes(c.debouncedSearch);
    let matchFilter = true;
    if (reminderFilter === 'pending') matchFilter = !r.isReminderRecent(cl.id);
    else if (reminderFilter === 'sent') matchFilter = r.isReminderRecent(cl.id);
    return matchSearch && matchFilter;
  });

  const counts = useMemo(() => {
    let pending = 0;
    let sent = 0;
    c.clients.forEach((cl) => {
      if (r.isReminderRecent(cl.id)) sent++;
      else pending++;
    });
    return { all: c.clients.length, pending, sent };
  }, [c.clients, r]);

  const handleOpenPanel = (client: (typeof c.clients)[0]) => {
    c.openPanelWithExpiry(client);
    setIsReminderOpen(false);
  };

  return (
    <AdminLayout mainClassName="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 pt-28 lg:pt-6 pb-40 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin')}
            className="text-zinc-500 hover:text-white transition-all cursor-pointer shrink-0 -ml-1"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Meus Clientes
            </h1>
            <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest mt-0.5">
              {c.clients.length} cadastrados
              {counts.inactive > 0 && (
                <span className="text-amber-400 ml-2">
                  · {counts.inactive} inativo{counts.inactive !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Search + New Client */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center focus-within:border-white/10 transition-all overflow-hidden">
          <div className="pl-4 pr-3 shrink-0">
            <Search size={15} className="text-zinc-600" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar contatos..."
            value={c.searchTerm}
            onChange={(e) => c.setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-3.5 text-xs font-medium text-white outline-none placeholder:text-zinc-600 text-left overflow-hidden text-ellipsis"
          />
        </div>
        {/* Bell Reminder - Desktop only */}
        <button
          onClick={() => setIsReminderOpen(true)}
          className="hidden lg:flex h-[46px] px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Bell size={15} className="text-[#D4AF37]" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Lembretes
          </span>
        </button>
        <button
          onClick={() => c.setIsCreatingClient(true)}
          className="h-[46px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#b8962e] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} className="text-black" />
          <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">
            Novo Cliente
          </span>
        </button>
      </div>

      <ReminderFilterTabs
        activeFilter={reminderFilter}
        onFilterChange={handleFilterChange}
        counts={counts}
      />

      {/* Client list */}
      <div>
        {c.loading ? (
          <SkeletonClients />
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {c.searchTerm
                ? 'Nenhum cliente atende a esses filtros de pesquisa.'
                : reminderFilter === 'pending'
                  ? 'Todos os clientes já foram lembrados recentemente!'
                  : reminderFilter === 'sent'
                    ? 'Nenhum lembrete enviado recentemente.'
                    : 'Nenhum cliente cadastrado.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="lg:hidden space-y-1">
              {(() => {
                const grouped: Record<string, typeof filteredClients> = {};
                filteredClients.forEach((client) => {
                  const letter = (client.name || '?').charAt(0).toUpperCase();
                  if (!grouped[letter]) grouped[letter] = [];
                  grouped[letter].push(client);
                });
                return Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([letter, clients]) => (
                    <div key={letter}>
                      <div className="px-4 py-2 sticky top-0 z-10">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase">
                          {letter}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {clients.map((client, idx) => {
                          return (
                            <div
                              key={client.id}
                              onClick={() => handleOpenPanel(client)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleOpenPanel(client);
                              }}
                              aria-label={`Cliente ${client.name}`}
                              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer border border-white/[0.04] bg-white/[0.02] transition-all duration-200 group text-left hover:bg-white/[0.04] active:scale-[0.98]"
                            >
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white uppercase">
                                  {client.name.charAt(0)}
                                </div>
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A] ${
                                    client.isInactive
                                      ? 'bg-red-500'
                                      : r.isReminderRecent(client.id)
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500'
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[13px] font-semibold text-white truncate">
                                  {client.name}
                                  {client.is_mensalista && (
                                    <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-bold align-middle">
                                      {c.plans.find((p) => p.id === client.mensalista_plan_id)
                                        ?.name || 'Plano'}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                  {formatPhone(client.phone)} · {client.lastVisit}
                                </p>
                              </div>
                              <ChevronRight size={14} className="text-zinc-700 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
              })()}
            </div>

            {/* Desktop */}
            <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredClients.map((client) => {
                const initial = (client.name || '?').charAt(0).toUpperCase();

                return (
                  <div
                    key={client.id}
                    onClick={() => handleOpenPanel(client)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleOpenPanel(client);
                    }}
                    aria-label={`Cliente ${client.name}, último corte: ${client.lastVisit}`}
                    className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] transition-all duration-200 cursor-pointer group text-left hover:-translate-y-[3px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[#D4AF37]/5 hover:border-[#D4AF37]/35 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-xl ${AVATAR_STYLE} flex items-center justify-center text-sm font-bold shrink-0`}
                        >
                          {initial}
                        </div>
                        <div
                          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0E0E0E] ${
                            client.isInactive
                              ? 'bg-red-500'
                              : r.isReminderRecent(client.id)
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] font-bold text-white truncate"
                          title={client.name}
                        >
                          {client.name}
                          {client.is_mensalista && (
                            <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-bold align-middle">
                              {c.plans.find((p) => p.id === client.mensalista_plan_id)?.name ||
                                'Plano'}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {formatPhone(client.phone)} · {client.lastVisit}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Client Panel */}
      <AnimatePresence>
        {c.selectedClient && (
          <ClientPanel
            client={c.selectedClient}
            panelBookings={c.panelBookings}
            panelTotal={c.panelTotal}
            panelLast={c.panelLast}
            notesText={c.notesText}
            isEditingNotes={c.isEditingNotes}
            savingNotes={c.savingNotes}
            plans={c.plans}
            planName={c.planName}
            onNotesChange={c.setNotesText}
            onToggleEditNotes={() => {
              if (c.isEditingNotes) {
                c.setIsEditingNotes(false);
                c.setNotesText(c.selectedClient?.notes || '');
              } else {
                c.setIsEditingNotes(true);
              }
            }}
            onSaveNotes={c.handleSaveNotes}
            onEdit={() => {
              if (c.selectedClient) {
                c.setEditName(c.selectedClient.name);
                c.setEditPhone(c.selectedClient.phone);
                c.setIsEditing(true);
              }
            }}
            onDelete={() => c.setIsDeleteOpen(true)}
            onReminder={() => setIsReminderOpen(true)}
            onClose={c.closePanel}
            onToggleMensalista={c.handleToggleMensalista}
            expiresAt={c.expiresAt}
            onRenewMensalidade={c.handleRenewMensalidade}
            milestoneProgress={c.milestoneProgress}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <DeleteClientModal
        isOpen={c.isDeleteOpen && !!c.selectedClient}
        clientName={c.selectedClient?.name || ''}
        isDeleting={c.isDeleting}
        onConfirm={c.confirmDelete}
        onCancel={() => c.setIsDeleteOpen(false)}
      />

      <EditClientModal
        isOpen={c.isEditing && !!c.selectedClient}
        name={c.editName}
        phone={c.editPhone}
        saving={c.saving}
        onNameChange={c.setEditName}
        onPhoneChange={c.setEditPhone}
        onSave={c.handleSaveEdit}
        onCancel={() => c.setIsEditing(false)}
      />

      <Suspense fallback={null}>
        <ReminderModal
          isOpen={isReminderOpen && !!reminderClient}
          clientName={reminderClient?.name || ''}
          templates={r.templates}
          onDeleteTemplate={r.handleDeleteTemplate}
          onSaveTemplate={r.handleSaveTemplate}
          onSendTemplate={(template: string) =>
            r.sendWithTemplate(reminderClient?.phone || '', template, reminderClient?.id || '')
          }
          onClose={() => {
            setIsReminderOpen(false);
            setReminderClient(null);
          }}
        />
      </Suspense>

      {/* Bulk Reminder Modal - Desktop */}
      <AnimatePresence>
        {isReminderOpen &&
          !reminderClient &&
          (() => {
            const clientsNeedingReminder = c.clients.filter(
              (client) => !r.isReminderRecent(client.id)
            );
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden lg:flex fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm items-center justify-center p-4"
                onClick={() => setIsReminderOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-[400px] bg-[#0E0E0E] border border-white/[0.06] rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                        <Bell size={14} className="text-[#D4AF37]" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.25em] block">
                          Enviar Lembrete
                        </span>
                        <p className="text-[12px] font-medium text-zinc-400 mt-0.5">
                          Selecione o cliente
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsReminderOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <ReminderClientList
                    clients={clientsNeedingReminder}
                    onSelect={(client) => {
                      setReminderClient(client);
                    }}
                  />
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      <Suspense fallback={null}>
        <NewClientModal
          isOpen={c.isCreatingClient}
          name={c.newClientName}
          phone={c.newClientPhone}
          notes={c.newClientNotes}
          saving={c.isSavingClient}
          error={c.newClientError}
          onNameChange={(v) => {
            c.setNewClientName(v);
          }}
          onPhoneChange={(v) => {
            c.setNewClientPhone(v);
          }}
          onNotesChange={c.setNewClientNotes}
          onSave={c.handleCreateClient}
          onCancel={() => {
            c.setIsCreatingClient(false);
            c.resetNewClientForm();
          }}
        />
      </Suspense>

      <ToastNotification toast={toast} />
    </AdminLayout>
  );
};

export default AdminClients;
