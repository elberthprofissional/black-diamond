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

/**
 * Gera templates sazonais com base na época do ano.
 * A primeira mensagem é temática (Dia dos Namorados, Natal, etc.),
 * as outras duas são genéricas mas com variação semanal/mensal.
 */
function getSeasonalTemplates(siteUrl: string): {
  name: string;
  body: string;
}[] {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // ─── Detecta estação/data especial ───
  interface Season {
    name: string;
    msg: string;
  }

  const seasons: [predicate: boolean, season: Season][] = [
    // Janeiro: Verão / Volta às Aulas
    [
      month === 1,
      {
        name: 'Verão 🌊',
        msg: `Fala aí! ☀️🌊 O verão tá pegando e você vai ficar de cabelo grande? Bora dar uma renovada no visual pra curtir a estação mais quente do ano! Vem pra Black Diamond! 💈🔥\n\n${siteUrl}`,
      },
    ],
    // Carnaval (Fevereiro / início de Março)
    [
      (month === 2 && day >= 1) || (month === 3 && day <= 10),
      {
        name: 'Carnaval 🎭',
        msg: `E aí, beleza? 🎭💈 O Carnaval está chegando e você não vai ficar de fora, né? Passa na Black Diamond pra sair na régua pra folia! 💈✨\n\n${siteUrl}`,
      },
    ],
    // Páscoa (Março / Abril)
    [
      (month === 3 && day >= 20) || (month === 4 && day <= 10),
      {
        name: 'Páscoa 🐰',
        msg: `Fala aí! 🐰🥚 A Páscoa está chegando! Além dos chocolates, que tal um trato no visual pra renovar? Vem pra Black Diamond sair na régua! 💈✨\n\n${siteUrl}`,
      },
    ],
    // Dia das Mães (Maio)
    [
      month === 5 && day <= 15,
      {
        name: 'Dia das Mães 🌷',
        msg: `O Dia das Mães está chegando! 🌷💈 E que tal passar o Dia das Mães na régua? Sua mãe merece te ver lindão! Vem pra Black Diamond caprichar nesse corte! 💈❤️\n\n${siteUrl}`,
      },
    ],
    // Dia dos Namorados (Junho)
    [
      month === 6 && day <= 14,
      {
        name: 'Dia dos Namorados ❤️',
        msg: `Dia dos Namorados chegando! ❤️💈 Bora ficar na régua pra arrasar no encontro? A Black Diamond te deixa pronto pro romance! 💈🔥\n\n${siteUrl}`,
      },
    ],
    // Festa Junina (Junho/Julho)
    [
      (month === 6 && day >= 15) || (month === 7 && day <= 15),
      {
        name: 'Festa Junina 🌽',
        msg: `Festa Junina chegando! 🎉🌽 Bora ficar na régua pra quadrilha? Vem pra Black Diamond que o corte é fogueira aprovada! 💈🔥\n\n${siteUrl}`,
      },
    ],
    // Dia dos Pais (Agosto)
    [
      month === 8 && day <= 15,
      {
        name: 'Dia dos Pais 👔',
        msg: `Dia dos Pais chegando! 👔💈 Bora dar aquele trato no visual pra comemorar em grande estilo? Vem pra Black Diamond! 💈🔥\n\n${siteUrl}`,
      },
    ],
    // Primavera (Setembro/Outubro)
    [
      month === 9 || month === 10,
      {
        name: 'Primavera 🌸',
        msg: `Primavera chegou! 🌸💈 Que tal renovar o visual pra estação das flores? A Black Diamond te espera de braços abertos! 💈✨\n\n${siteUrl}`,
      },
    ],
    // Black Friday (Novembro)
    [
      month === 11,
      {
        name: 'Black Friday 🏷️',
        msg: `Black Friday na Black Diamond! 🏷️💈 Aproveita as condições especiais e sai na régua economizando! Corre que é por tempo limitado! 🔥\n\n${siteUrl}`,
      },
    ],
  ];

  // Natal / Ano Novo (Dezembro - padrão/catch-all)
  const isNatal = month === 12;
  const season: Season = isNatal
    ? {
        name: 'Natal 🎄',
        msg: `Natal chegando! 🎄💈 Já agendou seu corte pra passar o Natal na régua? Vem pra Black Diamond e arrasa nas festas de fim de ano! 🎅🔥\n\n${siteUrl}`,
      }
    : {
        name: 'Sempre na régua 💈',
        msg: `E aí! Beleza? 💈 Passando pra lembrar de garantir seu horário essa semana no Black Diamond. Não deixa pra última hora! 🔥\n\n${siteUrl}`,
      };

  const matched = seasons.find(([pred]) => pred);
  const seasonal = matched ? matched[1] : season;

  // Nome do mês pra variar a msg genérica
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const currentMonth = monthNames[month - 1];

  return [
    { name: seasonal.name, body: seasonal.msg },
    {
      name: 'Agenda Semanal 📅',
      body: `Fala aí! 👊💈 Tudo bem? Só passando pra lembrar que a agenda pro mês de ${currentMonth} tá aberta. Bora garantir seu horário na Black Diamond? Não deixa pra depois!\n\n${siteUrl}`,
    },
    {
      name: 'Fim de Semana 🚀',
      body: `Fala! O fim de semana tá chegando e a agenda tá lotando! 💈 Bora dar aquele trato no visual? Garanta seu horário agora mesmo!\n\n${siteUrl}`,
    },
  ];
}

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

  // Inicializa templates padrão sazonais se estiver vazio
  useEffect(() => {
    const existing = loadTemplatesFromStorage();
    if (existing.length === 0) {
      const siteUrl = window.location.origin + '/agendar';
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
