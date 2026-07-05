import { useState, useCallback, useMemo } from 'react';
import {
  getBookings,
  updateClient,
  updateClientNotes,
  deleteClient,
  toggleClientMensalista,
} from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { useToast } from './useToast';
import type { ClientWithStats, BookingWithClient } from '../types';

export function useClientPanel(
  setClients: React.Dispatch<React.SetStateAction<ClientWithStats[]>>
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

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    try {
      const bookings = await getBookings();
      setPanelBookings(
        bookings
          .filter((b) => b.client_id === client.id)
          .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
      );
    } catch {
      setPanelBookings([]);
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
  }, [selectedClient, editName, editPhone, showError, setClients]);

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
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      closePanel();
      showSuccess('Cliente excluído!');
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }, [selectedClient, closePanel, showSuccess, showError, setClients]);

  const handleToggleMensalista = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const newValue = !selectedClient.is_mensalista;
      await toggleClientMensalista(selectedClient.id, newValue);
      setSelectedClient((prev) => (prev ? { ...prev, is_mensalista: newValue } : prev));
      setClients((prev) =>
        prev.map((c) => (c.id === selectedClient.id ? { ...c, is_mensalista: newValue } : c))
      );
      showSuccess(newValue ? 'Cliente agora é mensalista!' : 'Mensalidade removida.');
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [selectedClient, showSuccess, showError, setClients]);

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
    notesText,
    setNotesText,
    isEditingNotes,
    setIsEditingNotes,
    savingNotes,
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleting,
    openPanel,
    closePanel,
    handleSaveEdit,
    handleSaveNotes,
    confirmDelete,
    handleToggleMensalista,
    panelTotal,
    panelLast,
  };
}
