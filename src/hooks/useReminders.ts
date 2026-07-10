import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './useToast';

const SENT_KEY = 'barber_reminders_sent';
const TEMPLATES_KEY = 'barber_templates';

interface LocalTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES = (siteUrl: string) => [
  `E aí! Beleza? 💈 Passando para lembrar de garantir seu horário para essa semana no Black Diamond. Não deixe para a última hora!\n\n${siteUrl}`,
  `Fala! O fim de semana está chegando e a agenda está lotando. 💈 Bora dar aquele trato no visual para o fim de semana? Garanta seu horário!\n\n${siteUrl}`,
  `Olá! Tudo bem? Passando para lembrar de agendar seu horário conosco esta semana no Black Diamond! 💈\n\n${siteUrl}`,
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTemplatesFromStorage(): LocalTemplate[] {
  try {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveTemplatesToStorage(templates: LocalTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // localStorage cheio ou indisponível — ignora
  }
}

export function useReminders() {
  const { showSuccess, showError } = useToast();
  const templatesRef = useRef<LocalTemplate[]>([]);

  const [remindersSent, setRemindersSent] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(SENT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
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

  // Inicializa templates padrão se estiver vazio
  useEffect(() => {
    const existing = loadTemplatesFromStorage();
    if (existing.length === 0) {
      const siteUrl = window.location.origin + '/agendar';
      const defaults = DEFAULT_TEMPLATES(siteUrl);
      const now = new Date().toISOString();
      const created: LocalTemplate[] = defaults.map((body, i) => ({
        id: generateId(),
        key: 'reminder',
        name: `Lembrete ${i + 1}`,
        body,
        created_at: now,
        updated_at: now,
      }));
      saveTemplatesToStorage(created);
      setTemplates(created);
    }
    setLoading(false);
  }, []);

  const markReminderSent = useCallback((clientId: string) => {
    setRemindersSent((prev) => {
      const updated = { ...prev, [clientId]: new Date().toISOString() };
      localStorage.setItem(SENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isReminderRecent = useCallback(
    (clientId: string): boolean => {
      const lastSent = remindersSent[clientId];
      if (!lastSent) return false;
      return Date.now() - new Date(lastSent).getTime() < 7 * 24 * 60 * 60 * 1000;
    },
    [remindersSent]
  );

  const sendWithTemplate = useCallback(
    (phone: string, template: string, clientId: string) => {
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
      markReminderSent(clientId);
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
