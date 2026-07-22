import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './useToast';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { getTemplates, createTemplate, deleteTemplate } from '../lib/api/templates';
import { STORAGE_REMINDERS_SENT, STORAGE_REMINDER_TEMPLATES } from '../lib/constants';
// TypeScript infere tipos muito restritivos de JSON imports (cada season tem dayRange diferente).
// Cast único para o tipo nomeado definido abaixo.
import seasonalDataRaw from '../data/seasonal-templates.json';

interface SeasonalTemplate {
  name: string;
  body: string;
}

interface SeasonalSeason {
  key: string;
  predicate: {
    month: number[];
    dayRange: Record<string, number[]>;
  };
  templates: SeasonalTemplate[];
}

interface SeasonalTemplates {
  generic: SeasonalTemplate[];
  seasons: SeasonalSeason[];
}

const seasonalData = seasonalDataRaw as unknown as SeasonalTemplates;

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
    if (!range || range.length < 2) return false;
    return range[0]! <= day && day <= range[1]!;
  };

  const matched = seasonalData.seasons.find((s) => matchSeason(s.predicate));
  const templates = matched?.templates ?? seasonalData.generic;
  return templates.map((t) => ({ name: t.name, body: fill(t.body) }));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Carrega templates do Supabase (com fallback para localStorage). */
async function loadTemplatesFromDB(): Promise<LocalTemplate[]> {
  try {
    const dbTemplates = await getTemplates('reminder');
    if (dbTemplates.length > 0) {
      // Sincroniza localStorage como cache offline
      localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(dbTemplates));
      return dbTemplates;
    }
  } catch (e) {
    logError(e);
  }
  // Fallback para localStorage quando offline
  try {
    const saved = localStorage.getItem(STORAGE_REMINDER_TEMPLATES);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    logError(e);
    return [];
  }
}

/** Salva um ou mais templates NOVOS no Supabase (evita duplicatas dos existentes).
 *  Atualiza localStorage como cache offline.
 *  Para grande volume, a função deve receber apenas templates que ainda não existem no DB. */
async function saveTemplatesToDB(
  newTemplate: LocalTemplate,
  existingTemplates: LocalTemplate[]
): Promise<void> {
  try {
    // Insere APENAS o template novo no Supabase
    await createTemplate(newTemplate.key, newTemplate.name, newTemplate.body);
    // Atualiza localStorage com o array completo (cache offline)
    const allTemplates = [...existingTemplates, newTemplate];
    localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(allTemplates));
  } catch (e) {
    logError(e);
    // Fallback: salva apenas no localStorage
    try {
      const allTemplates = [...existingTemplates, newTemplate];
      localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(allTemplates));
    } catch {
      // localStorage indisponível — ignora
    }
  }
}

/** Deleta um template do Supabase (com fallback para localStorage). */
async function deleteTemplateFromDB(
  id: string,
  templates: LocalTemplate[]
): Promise<LocalTemplate[]> {
  try {
    await deleteTemplate(id);
  } catch (e) {
    logError(e);
  }
  const updated = templates.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(updated));
  } catch {
    // localStorage indisponível — ignora
  }
  return updated;
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
    // Estado inicial síncrono do localStorage (evita flash de vazio)
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
          // Cria templates sazonais padrão (primeira execução)
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
          // Insere cada template sazonal individualmente no Supabase
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
        // Fallback: tenta carregar do localStorage
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
    async (id: string) => {
      const updated = await deleteTemplateFromDB(id, templatesRef.current);
      setTemplates(updated);
      templatesRef.current = updated;
      showSuccess('Modelo de lembrete excluído!');
    },
    [showSuccess]
  );

  const handleSaveTemplate = useCallback(
    async (text: string) => {
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
      await saveTemplatesToDB(newTemplate, templatesRef.current);
      setTemplates(updated);
      templatesRef.current = updated;
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
