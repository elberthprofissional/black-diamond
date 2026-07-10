import { useState, useCallback } from 'react';
import { createClient } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';

export function useClientCreation(loadData: () => Promise<void>) {
  const { showSuccess } = useToast();
  const { log } = useAuditLog();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [newClientError, setNewClientError] = useState('');

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
      const phone = newClientPhone.replace(/\D/g, '');
      const name = newClientName.trim();

      const { data: existingPhone } = await supabase
        .from('clients')
        .select('id, name, manually_added')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      if (existingPhone) {
        if (existingPhone.manually_added) {
          setNewClientError(`Este telefone já está cadastrado para "${existingPhone.name}".`);
          setIsSavingClient(false);
          return;
        }
        const { error: updateErr } = await supabase
          .from('clients')
          .update({ manually_added: true })
          .eq('id', existingPhone.id);
        if (updateErr) {
          setNewClientError(getErrorMessage(updateErr));
          setIsSavingClient(false);
          return;
        }
        setIsCreatingClient(false);
        resetNewClientForm();
        showSuccess(`${existingPhone.name} adicionado com sucesso!`);
        await loadData();
        setIsSavingClient(false);
        return;
      }

      const { data: existingName } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', name)
        .limit(1)
        .maybeSingle();
      if (existingName) {
        setNewClientError('Este nome já está sendo usado por outro cliente.');
        setIsSavingClient(false);
        return;
      }

      await createClient({
        name,
        phone,
        email: newClientEmail.trim() || undefined,
        notes: newClientNotes.trim() || undefined,
        manually_added: true,
      });
      log({ action: 'client_created', details: { name, phone } });
      setIsCreatingClient(false);
      resetNewClientForm();
      showSuccess('Cliente criado com sucesso!');
      await loadData();
    } catch (error) {
      setNewClientError(getErrorMessage(error));
    } finally {
      setIsSavingClient(false);
    }
  }, [
    newClientName,
    newClientPhone,
    newClientEmail,
    newClientNotes,
    showSuccess,
    loadData,
    resetNewClientForm,
  ]);

  return {
    isCreatingClient,
    setIsCreatingClient,
    newClientName,
    setNewClientName,
    newClientPhone,
    setNewClientPhone,
    newClientEmail,
    setNewClientEmail,
    newClientNotes,
    setNewClientNotes,
    isSavingClient,
    newClientError,
    handleCreateClient,
    resetNewClientForm,
  };
}
