import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from './useToast';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fireAndForget } from '../lib/fire-and-forget';
import { createTemplate } from '../lib/api/templates';
import { STORAGE_REMINDERS_SENT, STORAGE_REMINDER_TEMPLATES } from '../lib/constants';
import {
  type LocalTemplate,
  getSeasonalTemplates,
  generateId,
  loadTemplatesFromDB,
  saveTemplateToDB,
  deleteTemplateFromDB as deleteTemplateFromLib,
  loadRemindersFromDB,
} from '../lib/reminders';

export function useReminders() {
  const { showSuccess, showError } = useToast();
  const templatesRef = useRef<LocalTemplate[]>([]);

  const [remindersSent, setRemindersSent] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REMINDERS_SENT);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      logError(e);
      return {};
    }
  });

  const [templates, setTemplates] = useState<LocalTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REMINDER_TEMPLATES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // Carrega dados do Supabase ao montar e mescla com localStorage
  useEffect(() => {
    let mounted = true;

    const loadFromDB = async () => {
      try {
        const dbReminders = await loadRemindersFromDB();
        if (!mounted) return;
        setRemindersSent((prev) => {
          const merged = { ...prev, ...dbReminders };
          localStorage.setItem(STORAGE_REMINDERS_SENT, JSON.stringify(merged));
          return merged;
        });
      } catch (e) {
        logError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFromDB();

    return () => {
      mounted = false;
    };
  }, []);

  // Carrega templates do Supabase ao montar; cria sazonais se vazio
  useEffect(() => {
    let mounted = true;

    const initTemplates = async () => {
      try {
        const dbTemplates = await loadTemplatesFromDB();
        if (!mounted) return;

        if (dbTemplates.length > 0) {
          setTemplates(dbTemplates);
          templatesRef.current = dbTemplates;
        } else {
          const baseUrl = import.meta.env.VITE_SITE_URL || 'https://black-diamond-wheat.vercel.app';
          const siteUrl = baseUrl + '/agendar';
          const defaults = getSeasonalTemplates(siteUrl);
          const now = new Date().toISOString();
          const created: LocalTemplate[] = defaults.map((t) => ({
            id: generateId(),
            key: 'reminder',
            name: t.name,
            body: t.body,
            created_at: now,
            updated_at: now,
          }));
          for (const ct of created) {
            try {
              await createTemplate(ct.key, ct.name, ct.body);
            } catch {
              /* ignora duplicatas */
            }
          }
          localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(created));
          if (!mounted) return;
          setTemplates(created);
          templatesRef.current = created;
        }
      } catch (e) {
        logError(e);
        try {
          const saved = localStorage.getItem(STORAGE_REMINDER_TEMPLATES);
          const local = saved ? JSON.parse(saved) : [];
          if (!mounted) return;
          setTemplates(local);
          templatesRef.current = local;
        } catch {
          // ignora
        }
      }
    };

    initTemplates();
    return () => {
      mounted = false;
    };
  }, []);

  // Mutation: marcar lembrete como enviado
  const markSentMutation = useMutation({
    mutationFn: async ({
      clientId,
      templateName,
      templateBody,
    }: {
      clientId: string;
      templateName?: string;
      templateBody?: string;
    }) => {
      const now = new Date().toISOString();

      const { error } = await supabase.rpc('log_reminder_sent', {
        p_client_id: clientId,
        p_template_name: templateName || null,
        p_message_preview: templateBody
          ? templateBody.slice(0, 100) + (templateBody.length > 100 ? '...' : '')
          : null,
      });

      if (error) throw error;
      return { clientId, now };
    },
    onSuccess: ({ clientId, now }) => {
      setRemindersSent((prev) => {
        const updated = { ...prev, [clientId]: now };
        try {
          localStorage.setItem(STORAGE_REMINDERS_SENT, JSON.stringify(updated));
        } catch (e) {
          logError(e);
        }
        return updated;
      });
    },
    onError: (e, { clientId }) => {
      logError(e, 'useReminders/markReminderSent');
      const now = new Date().toISOString();
      setRemindersSent((prev) => {
        const updated = { ...prev, [clientId]: now };
        try {
          localStorage.setItem(STORAGE_REMINDERS_SENT, JSON.stringify(updated));
        } catch {
          // ignora
        }
        return updated;
      });
    },
  });

  // Mutation: deletar template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteTemplateFromLib(id, templatesRef.current);
    },
    onSuccess: (updated) => {
      setTemplates(updated);
      templatesRef.current = updated;
      showSuccess('Modelo de lembrete excluído!');
    },
  });

  // Mutation: salvar template
  const saveTemplateMutation = useMutation({
    mutationFn: async (text: string) => {
      const now = new Date().toISOString();
      const newTemplate: LocalTemplate = {
        id: generateId(),
        key: 'reminder',
        name: 'Lembrete',
        body: text,
        created_at: now,
        updated_at: now,
      };
      await saveTemplateToDB(newTemplate, templatesRef.current);
      return newTemplate;
    },
    onSuccess: (newTemplate) => {
      const updated = [...templatesRef.current, newTemplate];
      setTemplates(updated);
      templatesRef.current = updated;
      showSuccess('Lembrete salvo nos modelos!');
    },
  });

  const markReminderSent = useCallback(
    (clientId: string, templateName?: string, templateBody?: string) => {
      fireAndForget(markSentMutation.mutateAsync({ clientId, templateName, templateBody }), {
        context: 'useReminders/markReminderSent',
      });

      const now = new Date().toISOString();
      setRemindersSent((prev) => {
        const updated = { ...prev, [clientId]: now };
        try {
          localStorage.setItem(STORAGE_REMINDERS_SENT, JSON.stringify(updated));
        } catch (e) {
          logError(e);
        }
        return updated;
      });
    },
    [markSentMutation]
  );

  const isReminderRecent = useCallback(
    (clientId: string): boolean => {
      const lastSent = remindersSent[clientId];
      if (!lastSent) return false;
      return Date.now() - new Date(lastSent).getTime() < 7 * 24 * 60 * 60 * 1000;
    },
    [remindersSent]
  );

  const sendWithTemplate = useCallback(
    (phone: string, template: string, clientId: string, templateName?: string) => {
      if (!phone) {
        showError('Cliente sem telefone cadastrado.');
        return;
      }
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = '55' + formattedPhone;
      }
      const win = window.open(
        `https://wa.me/${formattedPhone}?text=${encodeURIComponent(template)}`,
        '_blank'
      );
      if (!win || win.closed) {
        showError(
          'Bloqueador de pop-ups impediu de abrir o WhatsApp. Permita pop-ups deste site e tente novamente.'
        );
        return;
      }
      markReminderSent(clientId, templateName, template);
    },
    [markReminderSent, showError]
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      await deleteTemplateMutation.mutateAsync(id);
    },
    [deleteTemplateMutation]
  );

  const handleSaveTemplate = useCallback(
    async (text: string) => {
      await saveTemplateMutation.mutateAsync(text);
    },
    [saveTemplateMutation]
  );

  return {
    remindersSent,
    templates,
    loading,
    isReminderRecent,
    markReminderSent,
    sendWithTemplate,
    handleDeleteTemplate,
    handleSaveTemplate,
  };
}
