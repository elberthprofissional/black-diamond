import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useAuditLog } from './useAuditLog';
import { logError } from '../lib/logger';

export function useClientCreation(loadData: () => Promise<void>) {
  const { showSuccess } = useToast();
  const { log: auditLog } = useAuditLog();
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

  // Mutation para criar cliente
  const createMutation = useMutation({
    mutationFn: async () => {
      const name = newClientName.trim();
      const phone = newClientPhone.replace(/\D/g, '');

      if (!name || !phone) {
        throw new Error('Preencha nome e telefone.');
      }

      // Verifica telefone duplicado
      const { data: existingPhone } = await supabase
        .from('clients')
        .select('id, name, manually_added')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      if (existingPhone) {
        if (existingPhone.manually_added) {
          throw new Error(`Este telefone já está cadastrado para "${existingPhone.name}".`);
        }
        // Marca como manually_added se veio de booking online
        const { error: updateErr } = await supabase
          .from('clients')
          .update({ manually_added: true })
          .eq('id', existingPhone.id);
        if (updateErr) throw updateErr;
        return { type: 'updated', name: existingPhone.name } as const;
      }

      // Verifica nome duplicado
      const { data: existingName } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', name)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (existingName) {
        throw new Error('Este nome já está sendo usado por outro cliente.');
      }

      // Cria novo cliente
      await createClient({
        name,
        phone,
        email: newClientEmail.trim() || undefined,
        notes: newClientNotes.trim() || undefined,
        manually_added: true,
      });

      await auditLog({
        action: 'client_created',
        details: { name, phone },
      });

      return { type: 'created', name } as const;
    },
    onSuccess: (result) => {
      if (result.type === 'updated') {
        showSuccess(`${result.name} adicionado com sucesso!`);
      } else {
        showSuccess('Cliente criado com sucesso!');
      }
      setIsCreatingClient(false);
      resetNewClientForm();
      loadData().catch((e) => logError(e, 'useClientCreation/loadData'));
    },
    onError: (error) => {
      setNewClientError(getErrorMessage(error));
    },
    onSettled: () => {
      setIsSavingClient(false);
    },
  });

  const handleCreateClient = useCallback(async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setNewClientError('');
    setIsSavingClient(true);
    await createMutation.mutateAsync();
  }, [newClientName, newClientPhone, createMutation]);

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
