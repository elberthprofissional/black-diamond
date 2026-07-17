import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './useToast';
import { logError } from '../lib/logger';

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
 * Gera 3 templates de lembrete com base na época do ano.
 * Cada data especial substitui TODOS os 3 modelos por versões temáticas.
 * Períodos sem data especial usam os genéricos de fallback.
 */
function getSeasonalTemplates(siteUrl: string): {
  name: string;
  body: string;
}[] {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
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

  // Fallback genérico: 3 modelos pra meses sem data especial
  const generic = (): { name: string; body: string }[] => {
    const m = monthNames[month - 1];
    return [
      {
        name: 'Na Régua 💈',
        body: `E aí! Beleza? 💈 Passando pra lembrar de garantir seu horário essa semana no Black Diamond. Não deixa pra última hora! 🔥\n\n${siteUrl}`,
      },
      {
        name: `Agenda ${m} 📅`,
        body: `Fala aí! 👊💈 Tudo bem? Só passando pra lembrar que a agenda pro mês de ${m} tá aberta. Bora garantir seu horário na Black Diamond? Não deixa pra depois!\n\n${siteUrl}`,
      },
      {
        name: 'Fim de Semana 🚀',
        body: `Fala! O fim de semana tá chegando e a agenda tá lotando! 💈 Bora dar aquele trato no visual? Garanta seu horário agora mesmo!\n\n${siteUrl}`,
      },
    ];
  };

  // Cada data especial retorna 3 templates completos
  const seasons: [predicate: boolean, templates: { name: string; body: string }[]][] = [
    // 🎭 Carnaval (Fevereiro / início de Março)
    [
      (month === 2 && day >= 1) || (month === 3 && day <= 10),
      [
        {
          name: 'Carnaval 🎭',
          body: `E aí, beleza? 🎭💈 O Carnaval está chegando e você não vai ficar de fora, né? Passa na Black Diamond pra sair na régua pra folia! 💈✨\n\n${siteUrl}`,
        },
        {
          name: 'Folia na Régua 🎉',
          body: `Fala aí! 🎭💈 A folia tá chegando e a agenda já tá enchendo! Garanta seu horário antes que acabe e sai na régua pro Carnaval mais estiloso da sua vida! Vem pra Black Diamond! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Pré-Carnaval ✨',
          body: `Oba! 🎭✨ Carnaval à vista! Você já garantiu aquele trato no visual pra pular a folia? Na Black Diamond o corte é nota 10! Corre agendar! 💈🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 🐰 Páscoa (Março / Abril)
    [
      (month === 3 && day >= 20) || (month === 4 && day <= 10),
      [
        {
          name: 'Páscoa 🐰',
          body: `Fala aí! 🐰🥚 A Páscoa está chegando! Além dos chocolates, que tal renovar o visual pra ficar ainda mais bonito na foto em família? Vem pra Black Diamond! 💈✨\n\n${siteUrl}`,
        },
        {
          name: 'Renovar o Visual 🌷',
          body: `Páscoa é tempo de renovação! 🐰💈 Que tal começar renovando o visual? A Black Diamond te espera pra sair na régua e arrasar no almoço de Páscoa! 🥚🔥\n\n${siteUrl}`,
        },
        {
          name: 'Família na Régua 👨‍👩‍👧‍👦',
          body: `A Páscoa é pra reunir a família e você não vai ficar de cabelo grande, né? 🐰💈 Passa na Black Diamond e chega lindão no almoço de Páscoa! 🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 🌷 Dia das Mães (Maio)
    [
      month === 5 && day <= 15,
      [
        {
          name: 'Dia das Mães 🌷',
          body: `O Dia das Mães está chegando! 🌷💈 E que tal passar o Dia das Mães na régua? Sua mãe merece te ver lindão! Vem pra Black Diamond caprichar nesse corte! 💈❤️\n\n${siteUrl}`,
        },
        {
          name: 'Presente pra Mãe 🎁',
          body: `Sabe o melhor presente pro Dia das Mães? 🌷💈 Você de cabelo novo e sua mãe morrendo de orgulho! Vem pra Black Diamond que o corte é por conta da casa (metaforicamente kkk)! 💈🔥\n\n${siteUrl}`,
        },
        {
          name: 'Merece o Melhor ❤️',
          body: `Ela te deu a vida, o mínimo que você pode fazer é estar lindão no Dia das Mães! 🌷💈 Passa na Black Diamond e chega na régua! Sua mãe merece! 🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // ❤️ Dia dos Namorados (Junho)
    [
      month === 6 && day <= 14,
      [
        {
          name: 'Dia dos Namorados ❤️',
          body: `Dia dos Namorados chegando! ❤️💈 Bora ficar na régua pra arrasar no encontro? A Black Diamond te deixa pronto pro romance! 💈🔥\n\n${siteUrl}`,
        },
        {
          name: 'Arrasar no Encontro 💕',
          body: `O Dia dos Namorados tá perto e você vai encontrar seu amor do jeito que tá? ❤️💈 Vem pra Black Diamond dar um trato no visual e fazer o coração dela disparar! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Amor na Régua 💘',
          body: `Amor à primeira vista começa com um corte maneiro! ❤️💈 Dia dos Namorados chegando — garanta seu horário na Black Diamond e esteja pronto ou pronta pra arrasar! 💘🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 🌽 Festa Junina (Junho/Julho)
    [
      (month === 6 && day >= 15) || (month === 7 && day <= 15),
      [
        {
          name: 'Festa Junina 🌽',
          body: `Festa Junina chegando! 🎉🌽 Bora ficar na régua pra quadrilha? Vem pra Black Diamond que o corte é fogueira aprovada! 💈🔥\n\n${siteUrl}`,
        },
        {
          name: 'Arraiá da Régua 🎵',
          body: `O arraiá mais esperado do ano tá chegando! 🎉🌽 Já garantiu seu corte pra dançar quadrilha e comer pipoca? Vem pra Black Diamond que o visual vai ser quentinho igual canjica! 💈🔥\n\n${siteUrl}`,
        },
        {
          name: 'São João no Visu 🌽',
          body: `Festeiro ou não, todo mundo merece um trato no visual pra época mais animada do ano! 🎉💈 Vem de Black Diamond e cai na fogueira na régua! 🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 👔 Dia dos Pais (Agosto)
    [
      month === 8 && day <= 15,
      [
        {
          name: 'Dia dos Pais 👔',
          body: `Dia dos Pais chegando! 👔💈 Bora dar aquele trato no visual pra comemorar em grande estilo? Vem pra Black Diamond! 💈🔥\n\n${siteUrl}`,
        },
        {
          name: 'Orgulho do Velho 👊',
          body: `Nada deixa um pai mais orgulhoso do que ver o filho na régua! 👔💈 Dia dos Pais chegando — passa na Black Diamond e chega lindão no churrasco! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Estilo de Pai 🎯',
          body: `Ser pai é ser exemplo, e exemplo começa pelo visual! 👔💈 Dia dos Pais chegando — garanta seu horário na Black Diamond e mostre pro seu filho o que é estilo! 🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 🏷️ Black Friday (Novembro)
    [
      month === 11,
      [
        {
          name: 'Black Friday 🏷️',
          body: `Black Friday na Black Diamond! 🏷️💈 Condições especiais pra você sair na régua economizando! Corre que é por tempo limitado! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Oferta Imperdível 🛍️',
          body: `Black Friday é hoje! 🏷️💈 Aproveita as promoções da Black Diamond e garanta aquele trato no visual com um precinho imperdível! Corre que a agenda voa! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Sextou Black 💰',
          body: `Sextou! E é Black Friday! 🏷️💈 A Black Diamond tá com condições especiais que você não pode perder. Bora ficar na régua sem pesar no bolso? Corre agendar! 🔥\n\n${siteUrl}`,
        },
      ],
    ],

    // 🎄 Natal (Dezembro)
    [
      month === 12,
      [
        {
          name: 'Natal 🎄',
          body: `Natal chegando! 🎄💈 Já agendou seu corte pra passar o Natal na régua? Vem pra Black Diamond e arrasa nas festas de fim de ano! 🎅🔥\n\n${siteUrl}`,
        },
        {
          name: 'Réveillon na Régua 🎆',
          body: `Ano Novo, visual novo! 🎆💈 O Réveillon tá chegando e você vai virar o ano de cabelo grande? Vem pra Black Diamond e começa o ano na régua! 🔥\n\n${siteUrl}`,
        },
        {
          name: 'Fim de Ano 🎊',
          body: `As festas de fim de ano tão chegando! 🎄🎆 Já pensou em como você vai estar nas fotos? Passa na Black Diamond e garante um corte impecável pro Natal e Ano Novo! 💈🔥\n\n${siteUrl}`,
        },
      ],
    ],
  ];

  const matched = seasons.find(([pred]) => pred);
  return matched ? matched[1] : generic();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTemplatesFromStorage(): LocalTemplate[] {
  try {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    logError(e);
    return [];
  }
}

function saveTemplatesToStorage(templates: LocalTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    logError(e);
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
