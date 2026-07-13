import { useState, useCallback, useMemo } from 'react';
import {
  updateClient,
  updateClientNotes,
  deleteClient,
  toggleClientMensalista,
  type MilestoneProgress,
} from '../lib/api';
import { getClientMilestones } from '../lib/api/loyalty';
import { supabase } from '../lib/supabase';
import { getErrorMessage, maskName, maskPhone, getLocalDateString } from '../lib/utils';
import { MASK_SENSITIVE_DATA } from '../lib/constants';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';
import type { ClientWithStats, BookingWithClient, MensalistaPlan } from '../types';

export function useClientPanel(
  setClients: React.Dispatch<React.SetStateAction<ClientWithStats[]>>,
  plans: MensalistaPlan[]
) {
  const { showSuccess, showError } = useToast();
  const { log } = useAuditLog();
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
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);

  const planName = useMemo(() => {
    if (!selectedClient?.is_mensalista || !selectedClient?.mensalista_plan_id) return undefined;
    return plans.find((p) => p.id === selectedClient.mensalista_plan_id)?.name;
  }, [selectedClient, plans]);

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(MASK_SENSITIVE_DATA ? 'Informações ocultadas para o vídeo' : client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    try {
      const [bookingsRes, milestones] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, clients(name, phone)')
          .eq('client_id', client.id)
          .order('booking_date', { ascending: false }),
        getClientMilestones(client.id).catch(() => [] as MilestoneProgress[]),
      ]);
      let bData = (bookingsRes.data || []) as BookingWithClient[];
      if (MASK_SENSITIVE_DATA) {
        bData = bData.map((b) => {
          const clients = b.clients
            ? {
                name: maskName(b.clients.name),
                phone: maskPhone(b.clients.phone),
              }
            : {
                name: '',
                phone: '',
              };
          return {
            ...b,
            clients,
            total_price: 0,
          };
        });
      }
      setPanelBookings(bData);
      setMilestoneProgress(milestones);
    } catch {
      setPanelBookings([]);
      setMilestoneProgress([]);
    }
  }, []);

  const closePanel = useCallback(() => {
    setSelectedClient(null);
    setIsEditing(false);
    setIsEditingNotes(false);
    setIsDeleteOpen(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedClient || !editName.trim() || !editPhone.trim()) return;
    setSaving(true);
    try {
      await updateClient(selectedClient.id, { name: editName.trim(), phone: editPhone.trim() });
      log({
        action: 'client_updated',
        target_id: selectedClient.id,
        details: { name: editName.trim(), phone: editPhone.trim() },
      });
      setSelectedClient((p) => (p ? { ...p, name: editName.trim(), phone: editPhone.trim() } : p));
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id ? { ...c, name: editName.trim(), phone: editPhone.trim() } : c
        )
      );
      setIsEditing(false);
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [selectedClient, editName, editPhone, showError, setClients, log]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try {
      await updateClientNotes(selectedClient.id, notesText.trim());
      setSelectedClient((p) => (p ? { ...p, notes: notesText.trim() } : p));
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setSavingNotes(false);
    }
  }, [selectedClient, notesText, showError]);

  const confirmDelete = useCallback(async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    try {
      await deleteClient(selectedClient.id);
      log({
        action: 'client_deleted',
        target_id: selectedClient.id,
        details: { name: selectedClient.name, phone: selectedClient.phone },
      });
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      closePanel();
      showSuccess('Cliente excluído!');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }, [selectedClient, closePanel, showSuccess, showError, setClients, log]);

  const [expiresAt, setExpiresAt] = useState<string>('');

  const handleToggleMensalista = useCallback(
    async (planId?: string): Promise<boolean> => {
      if (!selectedClient) return false;
      try {
        const newValue = !selectedClient.is_mensalista;
        const expDate = newValue ? expiresAt || null : null;
        await toggleClientMensalista(selectedClient.id, newValue, planId, expDate);
        setSelectedClient((prev) =>
          prev
            ? {
                ...prev,
                is_mensalista: newValue,
                mensalista_plan_id: newValue ? planId : undefined,
                mensalista_expires_at: expDate || undefined,
              }
            : prev
        );
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? {
                  ...c,
                  is_mensalista: newValue,
                  mensalista_plan_id: newValue ? planId : undefined,
                  mensalista_expires_at: expDate || undefined,
                }
              : c
          )
        );
        setExpiresAt('');
        showSuccess(newValue ? 'Cliente agora é mensalista!' : 'Mensalidade removida.');
        return true;
      } catch (error) {
        showError(getErrorMessage(error));
        return false;
      }
    },
    [selectedClient, expiresAt, showSuccess, showError, setClients]
  );

  const openPanelWithExpiry = useCallback(
    async (client: ClientWithStats) => {
      await openPanel(client);
      if (client.mensalista_expires_at) {
        setExpiresAt(client.mensalista_expires_at);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setExpiresAt(getLocalDateString(d));
      }
    },
    [openPanel]
  );

  const handleRenewMensalidade = useCallback(
    async (days: number = 30) => {
      if (!selectedClient || !selectedClient.is_mensalista) return;
      try {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const newExpiry = getLocalDateString(d);
        await toggleClientMensalista(
          selectedClient.id,
          true,
          selectedClient.mensalista_plan_id,
          newExpiry
        );
        setSelectedClient((prev) => (prev ? { ...prev, mensalista_expires_at: newExpiry } : prev));
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id ? { ...c, mensalista_expires_at: newExpiry } : c
          )
        );
        setExpiresAt(newExpiry);
        showSuccess(`Mensalidade renovada até ${new Date(newExpiry).toLocaleDateString('pt-BR')}!`);
      } catch (error) {
        showError(getErrorMessage(error));
      }
    },
    [selectedClient, showSuccess, showError, setClients]
  );

  const panelTotal = useMemo(
    () => panelBookings.reduce((s, b) => s + Number(b.total_price), 0),
    [panelBookings]
  );
  const panelLast = useMemo(
    () => (panelBookings.length > 0 ? new Date(panelBookings[0].booking_date) : null),
    [panelBookings]
  );

  return {
    selectedClient,
    setSelectedClient,
    panelBookings,
    isEditing,
    setIsEditing,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    saving,
    milestoneProgress,
    notesText,
    setNotesText,
    isEditingNotes,
    setIsEditingNotes,
    savingNotes,
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleting,
    openPanel,
    openPanelWithExpiry,
    closePanel,
    handleSaveEdit,
    handleSaveNotes,
    confirmDelete,
    handleToggleMensalista,
    handleRenewMensalidade,
    expiresAt,
    setExpiresAt,
    panelTotal,
    panelLast,
    planName,
  };
}
