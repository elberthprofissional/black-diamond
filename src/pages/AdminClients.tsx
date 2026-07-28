import { useState, useMemo, lazy, Suspense, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useClients } from '../hooks/useClients';
import ReminderFilterTabs from '../components/Admin/shared/ReminderFilterTabs';
import { useReminders } from '../hooks/useReminders';
import { useToast } from '../hooks/useToast';
import AdminLayout from '../components/Admin/AdminLayout';
import ToastNotification from '../components/Admin/shared/ToastNotification';
import ClientPanel from '../components/Admin/shared/ClientPanel';
import DeleteClientModal from '../components/Admin/shared/DeleteClientModal';
import EditClientModal from '../components/Admin/shared/EditClientModal';
import ClientListHeader from '../components/Admin/clients/ClientListHeader';
import MobileClientList from '../components/Admin/clients/MobileClientList';
import DesktopClientGrid from '../components/Admin/clients/DesktopClientGrid';
import BulkReminderModal from '../components/Admin/clients/BulkReminderModal';
import { SkeletonClients } from '../components/Skeleton';
import type { Client } from '../types';

const NewClientModal = lazy(() => import('../components/Admin/shared/NewClientModal'));
const ReminderModal = lazy(() => import('../components/Admin/shared/ReminderModal'));

type ClientFilter = 'all' | 'pending' | 'sent' | 'mensalistas' | 'vencendo';

const AdminClients: FC = () => {
  const c = useClients();
  const r = useReminders();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderClient, setReminderClient] = useState<Client | null>(null);

  // eslint-disable-next-line react-hooks/purity
  const [nowMs] = useState(Date.now());

  const reminderFilter: ClientFilter =
    filterParam === 'pending' ||
    filterParam === 'sent' ||
    filterParam === 'mensalistas' ||
    filterParam === 'vencendo'
      ? filterParam
      : 'all';

  const handleFilterChange = (filter: string) => {
    // already derived from URL params, no local state needed
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
    else if (reminderFilter === 'mensalistas') matchFilter = !!cl.is_mensalista;
    else if (reminderFilter === 'vencendo') {
      if (!cl.is_mensalista || !cl.mensalista_expires_at) {
        matchFilter = false;
      } else {
        const expDate = new Date(cl.mensalista_expires_at + 'T23:59:59');
        matchFilter = expDate > new Date() && expDate <= new Date(nowMs + 5 * 86400000);
      }
    }
    return matchSearch && matchFilter;
  });

  const counts = useMemo(() => {
    let pending = 0;
    let sent = 0;
    let mensalistas = 0;
    let vencendo = 0;
    c.clients.forEach((cl) => {
      if (r.isReminderRecent(cl.id)) sent++;
      else pending++;
      if (cl.is_mensalista) {
        mensalistas++;
        if (cl.mensalista_expires_at) {
          const expDate = new Date(cl.mensalista_expires_at + 'T23:59:59');
          if (expDate > new Date() && expDate <= new Date(nowMs + 5 * 86400000)) {
            vencendo++;
          }
        }
      }
    });
    return { all: c.clients.length, pending, sent, mensalistas, vencendo };
  }, [c.clients, r, nowMs]);

  const clientsNeedingReminder = useMemo(
    () => c.clients.filter((client) => !r.isReminderRecent(client.id)),
    [c.clients, r]
  );

  const handleOpenPanel = (client: (typeof c.clients)[0]) => {
    c.openPanelWithExpiry(client);
    setIsReminderOpen(false);
  };

  return (
    <AdminLayout mainClassName="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-28 lg:pt-8 pb-40 max-w-[1440px] space-y-6 lg:space-y-8">
      <ClientListHeader
        clientCount={c.clients.length}
        searchTerm={c.searchTerm}
        onSearchChange={c.setSearchTerm}
        onNewClient={() => c.setIsCreatingClient(true)}
        onOpenReminders={() => setIsReminderOpen(true)}
      />

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
            <p className="text-[12px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
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
            <MobileClientList
              clients={filteredClients}
              plans={c.plans}
              isReminderRecent={r.isReminderRecent}
              onSelect={handleOpenPanel}
            />
            <DesktopClientGrid
              clients={filteredClients}
              plans={c.plans}
              isReminderRecent={r.isReminderRecent}
              onSelect={handleOpenPanel}
            />
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

      <BulkReminderModal
        isOpen={isReminderOpen && !reminderClient}
        clientsNeedingReminder={clientsNeedingReminder}
        onSelectClient={(client) => setReminderClient(client)}
        onClose={() => setIsReminderOpen(false)}
      />

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
