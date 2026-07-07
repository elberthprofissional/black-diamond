import React, { useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPhone } from '../lib/utils';
import { useClients } from '../hooks/useClients';
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
import { ArrowLeft, Search, ChevronRight, Plus } from 'lucide-react';

const AdminClients: React.FC = () => {
  const c = useClients();
  const r = useReminders();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [reminderFilter, setReminderFilter] = React.useState<'all' | 'pending' | 'sent'>(
    filterParam === 'pending' || filterParam === 'sent' ? filterParam : 'all'
  );
  const [isReminderOpen, setIsReminderOpen] = React.useState(false);

  React.useEffect(() => {
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

  const filteredClients = c.clients.filter((cl) => {
    const matchSearch =
      (cl.name || '').toLowerCase().includes(c.debouncedSearch.toLowerCase()) ||
      (cl.phone || '').includes(c.debouncedSearch);
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
    c.openPanel(client);
    setIsReminderOpen(false);
  };

  return (
    <AdminLayout mainClassName="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-28 lg:pt-6 pb-40 space-y-5">
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
            <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-widest mt-0.5">
              {c.clients.length} cadastrados
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
        <button
          onClick={() => c.setIsCreatingClient(true)}
          className="h-[46px] px-4 rounded-xl bg-[#C5A059] hover:bg-[#A68233] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} className="text-black" />
          <span className="text-[10px] font-bold text-black uppercase tracking-wider hidden sm:block">
            Novo Cliente
          </span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-6 border-b border-white/[0.04] w-full select-none pb-0 mt-2">
        {(['all', 'pending', 'sent'] as const).map((filter) => {
          const active = reminderFilter === filter;
          const label =
            filter === 'all' ? 'Todos' : filter === 'pending' ? 'A Lembrar' : 'Lembrados';
          const count =
            filter === 'all' ? counts.all : filter === 'pending' ? counts.pending : counts.sent;
          return (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className="relative pb-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none"
            >
              <span
                className={
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 transition-colors'
                }
              >
                {label}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${active ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'bg-white/5 text-zinc-500'}`}
              >
                {count}
              </span>
              {active && (
                <motion.div
                  layoutId="activeFilterTabClients"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

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
                        {clients.map((client) => {
                          const needsReminder = !r.isReminderRecent(client.id);
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
                              className={`w-full flex items-center gap-3 py-3.5 px-4 rounded-xl cursor-pointer border transition-all group text-left ${needsReminder ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03]'}`}
                            >
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white uppercase">
                                  {client.name.charAt(0)}
                                </div>
                                {client.is_mensalista ? (
                                  <div
                                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center ${needsReminder ? 'bg-[#C5A059]' : 'bg-emerald-500'}`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                                      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <div
                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${needsReminder ? 'bg-red-500' : 'bg-emerald-500'}`}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-white truncate">
                                  {client.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                  {formatPhone(client.phone)}
                                </p>
                                <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">
                                  Último corte:{' '}
                                  <span className="text-zinc-400">{client.lastVisit}</span>
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                {needsReminder && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      c.setSelectedClient(client);
                                      setIsReminderOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08]"
                                  >
                                    Lembrar
                                  </button>
                                )}
                                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
              })()}
            </div>

            {/* Desktop */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {filteredClients.map((client) => {
                const needsReminder = !r.isReminderRecent(client.id);
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
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group text-left ${needsReminder ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08]' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-center text-base font-bold text-white uppercase">
                        {client.name.charAt(0)}
                      </div>
                      {client.is_mensalista ? (
                        <div
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center ${needsReminder ? 'bg-[#C5A059]' : 'bg-emerald-500'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                          </svg>
                        </div>
                      ) : (
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] ${needsReminder ? 'bg-red-500' : 'bg-emerald-500'}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {formatPhone(client.phone)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                          Último corte:{' '}
                          <strong className="text-zinc-400">{client.lastVisit}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      {needsReminder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            c.setSelectedClient(client);
                            setIsReminderOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08]"
                        >
                          <svg
                            className="w-3.5 h-3.5 shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Lembrar
                        </button>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0"
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
          isOpen={isReminderOpen && !!c.selectedClient}
          clientName={c.selectedClient?.name || ''}
          templates={r.templates}
          onDeleteTemplate={r.handleDeleteTemplate}
          onSaveTemplate={r.handleSaveTemplate}
          onSendTemplate={(template: string) =>
            r.sendWithTemplate(c.selectedClient?.phone || '', template, c.selectedClient?.id || '')
          }
          onClose={() => setIsReminderOpen(false)}
        />
      </Suspense>

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
