import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  updateClient,
  updateClientNotes,
  deleteClient,
  toggleClientMensalista,
  type MilestoneProgress,
} from '../lib/api';
import { getClientMilestones } from '../lib/api/loyalty';
import { limparSenhaClienteAdmin } from '../lib/api/clientAuth';
import { supabase } from '../lib/supabase';
import { getErrorMessage, getLocalDateString } from '../lib/utils';
import { useToast } from './useToast';
import type { ClientWithStats, BookingWithClient, MensalistaPlan } from '../types';
import { logError } from '../lib/logger';

export function useClientPanel(
  setClients: React.Dispatch<React.SetStateAction<ClientWithStats[]>>,
  plans: MensalistaPlan[]
) {
  const { showSuccess, showError } = useToast();
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
    setNotesText(client.notes || '');
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
      const bData = (bookingsRes.data || []) as BookingWithClient[];
      setPanelBookings(bData);
      setMilestoneProgress(milestones);
    } catch (e) {
      logError(e);
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

  // Mutation: salvar edição do cliente
  const saveEditMutation = useMutation({
    mutationFn: async ({
      clientId,
      name,
      phone,
    }: {
      clientId: string;
      name: string;
      phone: string;
    }) => {
      await updateClient(clientId, { name, phone });
      return { name, phone };
    },
    onSuccess: (result, { clientId }) => {
      setSelectedClient((p) => (p ? { ...p, name: result.name, phone: result.phone } : p));
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, name: result.name, phone: result.phone } : c))
      );
      setIsEditing(false);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  // Mutation: salvar notas
  const saveNotesMutation = useMutation({
    mutationFn: async ({ clientId, notes }: { clientId: string; notes: string }) => {
      await updateClientNotes(clientId, notes);
      return notes;
    },
    onSuccess: (notes) => {
      setSelectedClient((p) => (p ? { ...p, notes } : p));
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
    onSettled: () => {
      setSavingNotes(false);
    },
  });

  // Mutation: deletar cliente
  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await deleteClient(clientId);
      return clientId;
    },
    onSuccess: (clientId) => {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      closePanel();
      showSuccess('Cliente excluído!');
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
    onSettled: () => {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    },
  });

  // Mutation: admin redefine a senha do cliente (fallback de recuperação)
  const resetPasswordMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const result = await limparSenhaClienteAdmin(clientId);
      if (!result?.ok) {
        throw new Error(result?.message || 'Não foi possível redefinir a senha.');
      }
      return result;
    },
    onSuccess: (result) => {
      showSuccess(result?.name ? `Senha de ${result.name} removida!` : 'Senha removida!');
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });

  const handleResetPassword = useCallback(async (): Promise<boolean> => {
    if (!selectedClient) return false;
    try {
      await resetPasswordMutation.mutateAsync(selectedClient.id);
      return true;
    } catch {
      return false;
    }
  }, [selectedClient, resetPasswordMutation]);

  // Mutation: alternar mensalista
  const toggleMensalistaMutation = useMutation({
    mutationFn: async ({
      clientId,
      newValue,
      planId,
      expDate,
    }: {
      clientId: string;
      newValue: boolean;
      planId?: string;
      expDate?: string | null;
    }) => {
      if (newValue) {
        await toggleClientMensalista(clientId, true, planId, expDate);
      } else {
        await toggleClientMensalista(clientId, false);
      }
      return { newValue, planId, expDate };
    },
    onSuccess: (result, { clientId }) => {
      const { newValue, planId, expDate } = result;
      setSelectedClient((prev) =>
        prev
          ? {
              ...prev,
              is_mensalista: newValue,
              mensalista_plan_id: newValue ? planId : undefined,
              mensalista_expires_at: newValue ? expDate || undefined : undefined,
            }
          : prev
      );
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                is_mensalista: newValue,
                mensalista_plan_id: newValue ? planId : undefined,
                mensalista_expires_at: newValue ? expDate || undefined : undefined,
              }
            : c
        )
      );
      if (newValue) {
        setExpiresAt('');
        showSuccess('Cliente agora é mensalista!');
      } else {
        showSuccess('Mensalidade removida.');
      }
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });

  // Mutation: renovar mensalidade
  const renewMensalidadeMutation = useMutation({
    mutationFn: async ({
      clientId,
      planId,
      days,
    }: {
      clientId: string;
      planId?: string;
      days: number;
    }) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const newExpiry = getLocalDateString(d);
      await toggleClientMensalista(clientId, true, planId, newExpiry);
      return newExpiry;
    },
    onSuccess: (newExpiry, { clientId }) => {
      setSelectedClient((prev) => (prev ? { ...prev, mensalista_expires_at: newExpiry } : prev));
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, mensalista_expires_at: newExpiry } : c))
      );
      setExpiresAt(newExpiry);
      showSuccess(`Mensalidade renovada até ${new Date(newExpiry).toLocaleDateString('pt-BR')}!`);
    },
    onError: (error) => {
      showError(getErrorMessage(error));
    },
  });

  const handleSaveEdit = useCallback(async () => {
    if (!selectedClient || !editName.trim() || !editPhone.trim()) return;
    setSaving(true);
    try {
      await saveEditMutation.mutateAsync({
        clientId: selectedClient.id,
        name: editName.trim(),
        phone: editPhone.trim(),
      });
    } catch {
      // onError já mostra o toast
    }
  }, [selectedClient, editName, editPhone, saveEditMutation]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try {
      await saveNotesMutation.mutateAsync({
        clientId: selectedClient.id,
        notes: notesText.trim(),
      });
    } catch {
      // onError já mostra o toast
    }
  }, [selectedClient, notesText, saveNotesMutation]);

  const confirmDelete = useCallback(async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    await deleteMutation.mutateAsync(selectedClient.id);
  }, [selectedClient, deleteMutation]);

  const [expiresAt, setExpiresAt] = useState<string>('');

  const handleToggleMensalista = useCallback(
    async (planId?: string, expiryDate?: string): Promise<boolean> => {
      if (!selectedClient) return false;
      try {
        const newValue = !selectedClient.is_mensalista;
        const expDate = newValue ? expiryDate || expiresAt || null : null;
        await toggleMensalistaMutation.mutateAsync({
          clientId: selectedClient.id,
          newValue,
          planId: newValue ? planId : undefined,
          expDate,
        });
        return true;
      } catch {
        return false;
      }
    },
    [selectedClient, expiresAt, toggleMensalistaMutation]
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
        await renewMensalidadeMutation.mutateAsync({
          clientId: selectedClient.id,
          planId: selectedClient.mensalista_plan_id,
          days,
        });
      } catch {
        // onError já mostra o toast
      }
    },
    [selectedClient, renewMensalidadeMutation]
  );

  const panelTotal = useMemo(
    () => panelBookings.reduce((s, b) => s + Number(b.total_price), 0),
    [panelBookings]
  );
  const panelLast = useMemo(
    () =>
      panelBookings.length > 0 && panelBookings[0] ? new Date(panelBookings[0].booking_date) : null,
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
    handleResetPassword,
    expiresAt,
    setExpiresAt,
    panelTotal,
    panelLast,
    planName,
  };
}
