import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { getClients, getBookings, getBookingsForStats, deleteClient, updateClient, updateClientNotes, createClient, toggleClientMensalista } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { Client, ClientWithStats, BookingWithClient } from '../types';

export function useClients() {
  const { showSuccess, showError } = useToast();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // New client creation
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [newClientError, setNewClientError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [clientsData, bookingsData] = await Promise.all([getClients(), getBookingsForStats()]);
      const todayISO = new Date();
      todayISO.setHours(0, 0, 0, 0);

      const allEnriched: ClientWithStats[] = (clientsData || [])
        .filter((c: Client) => c && c.name && c.name !== 'BLOQUEADO' && c.name !== 'CLIENTE EXCLUIDO' && c.phone !== '00000000000' && !c.is_blocked)
        .map((c: Client) => {
          const cb = (bookingsData || []).filter((b) => b && b.client_id === c.id && b.status !== 'cancelled');
          const upcoming = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate >= todayISO;
          }).sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())[0];
          const pastBookings = cb.filter((b) => {
            const bookingDate = new Date(b.booking_date + 'T00:00:00');
            return bookingDate <= todayISO;
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
            } : null,
          };
        });

      const enriched = allEnriched.filter((c) => c.bookingsCount >= 2 || c.manually_added);
      enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClients(enriched);
    } catch {
      showError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh on focus/visibility change
  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [loadData]);

  const debouncedSearch = useDeferredValue(searchTerm);

  const openPanel = useCallback(async (client: ClientWithStats) => {
    setSelectedClient(client);
    setNotesText(client.notes || '');
    setIsEditing(false);
    setIsEditingNotes(false);
    try {
      const bookings = await getBookings();
      setPanelBookings(bookings.filter((b) => b.client_id === client.id).sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()));
    } catch { setPanelBookings([]); }
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
      setSelectedClient((p) => p ? { ...p, name: editName.trim(), phone: editPhone.trim() } : p);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, name: editName.trim(), phone: editPhone.trim() } : c));
      setIsEditing(false);
    } catch (error) { showError(getErrorMessage(error)); }
    finally { setSaving(false); }
  }, [selectedClient, editName, editPhone, showError]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    try {
      await updateClientNotes(selectedClient.id, notesText.trim());
      setSelectedClient((p) => p ? { ...p, notes: notesText.trim() } : p);
    } catch (error) { showError(getErrorMessage(error)); }
    finally { setSavingNotes(false); }
  }, [selectedClient, notesText, showError]);

  const resetNewClientForm = useCallback(() => {
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientNotes('');
    setNewClientError('');
  }, []);

  const handleCreateClient = useCallback(async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setNewClientError('');
    setIsSavingClient(true);
    try {
      const phone = newClientPhone.trim();
      const name = newClientName.trim();

      const { data: existingPhone } = await supabase
        .from('clients').select('id, name, manually_added').eq('phone', phone).limit(1).maybeSingle();

      if (existingPhone) {
        if (existingPhone.manually_added) {
          setNewClientError(`Este telefone já está cadastrado para "${existingPhone.name}".`);
          setIsSavingClient(false);
          return;
        }
        const { error: updateErr } = await supabase.from('clients').update({ manually_added: true }).eq('id', existingPhone.id);
        if (updateErr) { setNewClientError(getErrorMessage(updateErr)); setIsSavingClient(false); return; }
        setIsCreatingClient(false);
        resetNewClientForm();
        showSuccess(`${existingPhone.name} adicionado com sucesso!`);
        await loadData();
        setIsSavingClient(false);
        return;
      }

      const { data: existingName } = await supabase.from('clients').select('id').ilike('name', name).limit(1).maybeSingle();
      if (existingName) { setNewClientError('Este nome já está sendo usado por outro cliente.'); setIsSavingClient(false); return; }

      const created = await createClient({ name, phone, email: newClientEmail.trim() || undefined, notes: newClientNotes.trim() || undefined, manually_added: true });
      setClients(prev => [...prev, { ...created, lastVisit: 'Nunca', totalSpent: 0, bookingsCount: 0, upcomingBooking: null }].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setIsCreatingClient(false);
      resetNewClientForm();
      showSuccess('Cliente criado com sucesso!');
    } catch (error) { setNewClientError(getErrorMessage(error)); }
    finally { setIsSavingClient(false); }
  }, [newClientName, newClientPhone, newClientEmail, newClientNotes, showSuccess, showError, loadData]);

  const confirmDelete = useCallback(async () => {
    if (!selectedClient) return;
    setIsDeleting(true);
    try {
      await deleteClient(selectedClient.id);
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      closePanel();
      showSuccess('Cliente excluído!');
    } catch (error) { showError(getErrorMessage(error)); }
    finally { setIsDeleting(false); setIsDeleteOpen(false); }
  }, [selectedClient, closePanel, showSuccess, showError]);

  const handleToggleMensalista = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const newValue = !selectedClient.is_mensalista;
      await toggleClientMensalista(selectedClient.id, newValue);
      setSelectedClient(prev => prev ? { ...prev, is_mensalista: newValue } : prev);
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, is_mensalista: newValue } : c));
      showSuccess(newValue ? 'Cliente agora é mensalista!' : 'Mensalidade removida.');
    } catch (error) { showError(getErrorMessage(error)); }
  }, [selectedClient, showSuccess, showError]);

  const panelTotal = useMemo(() => panelBookings.reduce((s, b) => s + Number(b.total_price), 0), [panelBookings]);
  const panelLast = useMemo(() => panelBookings.length > 0 ? new Date(panelBookings[0].booking_date) : null, [panelBookings]);

  return {
    // State
    clients, loading, searchTerm, setSearchTerm, debouncedSearch,
    selectedClient, setSelectedClient, panelBookings,
    isEditing, editName, setEditName, editPhone, setEditPhone, saving,
    notesText, setNotesText, isEditingNotes, setIsEditingNotes, savingNotes,
    isDeleteOpen, isDeleting,
    isCreatingClient, setIsCreatingClient,
    newClientName, setNewClientName, newClientPhone, setNewClientPhone,
    newClientEmail, setNewClientEmail, newClientNotes, setNewClientNotes,
    isSavingClient, newClientError,

    // Actions
    loadData, openPanel, closePanel,
    handleSaveEdit, handleSaveNotes, handleCreateClient, confirmDelete,
    handleToggleMensalista, setIsDeleteOpen, setIsEditing,
    resetNewClientForm,

    // Derived
    panelTotal, panelLast,
  };
}
