import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './useToast';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { STORAGE_REMINDERS_SENT, STORAGE_REMINDER_TEMPLATES } from '../lib/constants';
import seasonalData from '../data/seasonal-templates.json';

interface LocalTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gera 3 templates de lembrete com base na época do ano.
 * Dados carregados de seasonal-templates.json.
 */
function getSeasonalTemplates(siteUrl: string): {
  name: string;
  body: string;
}[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const fill = (s: string) =>
    s.replace(/\{siteUrl\}/g, siteUrl).replace(/\{month\}/g, monthNames[month - 1] ?? '');

  const matchSeason = (pred: { month: number[]; dayRange: Record<string, number[]> }) => {
    if (!pred.month.includes(month)) return false;
    const range = pred.dayRange[String(month)];
    return !!range && day >= range[0] && day <= range[1];
  };

  // Lazy-load the JSON data
  const data = seasonalData as {
    generic: { name: string; body: string }[];
    seasons: {
      predicate: { month: number[]; dayRange: Record<string, number[]> };
      templates: { name: string; body: string }[];
    }[];
  };

  const matched = data.seasons.find((s) => matchSeason(s.predicate));
  const templates = matched?.templates ?? data.generic;
  return templates.map((t) => ({ name: t.name, body: fill(t.body) }));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTemplatesFromStorage(): LocalTemplate[] {
  try {
    const saved = localStorage.getItem(STORAGE_REMINDER_TEMPLATES);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    logError(e);
    return [];
  }
}

function saveTemplatesToStorage(templates: LocalTemplate[]) {
  try {
    localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    logError(e);
    // localStorage cheio ou indisponível — ignora
  }
}

/** Carrega o histórico de lembretes do Supabase (últimos 7 dias) */
async function loadRemindersFromDB(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select('client_id, sent_at')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false });

    if (error || !data) return {};

    // Pega o envio mais recente por cliente
    const result: Record<string, string> = {};
    for (const row of data) {
      if (!result[row.client_id]) {
        result[row.client_id] = row.sent_at;
      }
    }
    return result;
  } catch (e) {
    logError(e);
    return {};
  }
}

export function useReminders() {
  const { showSuccess, showError } = useToast();
  const templatesRef = useRef<LocalTemplate[]>([]);

  // State inicial: localStorage (fallback offline)
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
    return loadTemplatesFromStorage();
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

        // Mescla: DB tem prioridade, localStorage preenche lacunas
        setRemindersSent((prev) => {
          const merged = { ...prev, ...dbReminders };
          localStorage.setItem(STORAGE_REMINDERS_SENT, JSON.stringify(merged));
          return merged;
        });
      } catch (e) {
        logError(e);
        // Falha ao carregar do banco — usa só localStorage
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFromDB();

    return () => {
      mounted = false;
    };
  }, []);

  // Inicializa templates padrão sazonais se estiver vazio
  useEffect(() => {
    const existing = loadTemplatesFromStorage();
    if (existing.length === 0) {
      const baseUrl = import.meta.env.VITE_SITE_URL || 'https://black-diamond.vercel.app';
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
      saveTemplatesToStorage(created);
      setTemplates(created);
    }
  }, []);

  const markReminderSent = useCallback(
    (clientId: string, templateName?: string, templateBody?: string) => {
      const now = new Date().toISOString();

      // Salva no Supabase (assíncrono, não bloqueia UI)
      const logPromise = supabase.rpc('log_reminder_sent', {
        p_client_id: clientId,
        p_template_name: templateName || null,
        p_message_preview: templateBody
          ? templateBody.slice(0, 100) + (templateBody.length > 100 ? '...' : '')
          : null,
      });
      // Garante type-safe usando Promise.resolve() que suporta .catch()
      Promise.resolve(logPromise)
        .then(() => {})
        .catch(() => {
          // Falha ao salvar no banco — localStorage mantém o registro
        });

      // Salva no localStorage como fallback
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
    []
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
    (id: string) => {
      const updated = templatesRef.current.filter((t) => t.id !== id);
      saveTemplatesToStorage(updated);
      setTemplates(updated);
      showSuccess('Modelo de lembrete excluído!');
    },
    [showSuccess]
  );

  const handleSaveTemplate = useCallback(
    (text: string) => {
      const now = new Date().toISOString();
      const newTemplate: LocalTemplate = {
        id: generateId(),
        key: 'reminder',
        name: 'Lembrete',
        body: text,
        created_at: now,
        updated_at: now,
      };
      const updated = [...templatesRef.current, newTemplate];
      saveTemplatesToStorage(updated);
      setTemplates(updated);
      showSuccess('Lembrete salvo nos modelos!');
    },
    [showSuccess]
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
