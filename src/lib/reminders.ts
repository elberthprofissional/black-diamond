import { getTemplates, createTemplate, deleteTemplate } from './api/templates';
import { supabase } from './supabase';
import { STORAGE_REMINDER_TEMPLATES } from './constants';
import { logError } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────

export interface LocalTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// ─── Seasonal Templates ─────────────────────────────────────────────────

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

// TypeScript infere tipos muito restritivos de JSON imports (cada season tem dayRange diferente).
// Cast único para o tipo nomeado definido acima.
import seasonalDataRaw from '../data/seasonal-templates.json';
const seasonalData = seasonalDataRaw as unknown as SeasonalTemplates;

const MONTH_NAMES = [
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

export function getSeasonalTemplates(siteUrl: string): { name: string; body: string }[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const fill = (s: string) =>
    s.replace(/\{siteUrl\}/g, siteUrl).replace(/\{month\}/g, MONTH_NAMES[month - 1] ?? '');

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

export function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Template Persistence ───────────────────────────────────────────────

/** Carrega templates do Supabase (com fallback para localStorage). */
export async function loadTemplatesFromDB(): Promise<LocalTemplate[]> {
  try {
    const dbTemplates = await getTemplates('reminder');
    if (dbTemplates.length > 0) {
      localStorage.setItem(STORAGE_REMINDER_TEMPLATES, JSON.stringify(dbTemplates));
      return dbTemplates;
    }
  } catch (e) {
    logError(e);
  }
  try {
    const saved = localStorage.getItem(STORAGE_REMINDER_TEMPLATES);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    logError(e);
    return [];
  }
}

/** Salva um template NOVO no Supabase (evita duplicatas dos existentes).
 *  Atualiza localStorage como cache offline. */
export async function saveTemplateToDB(
  newTemplate: LocalTemplate,
  existingTemplates: LocalTemplate[]
): Promise<void> {
  try {
    await createTemplate(newTemplate.key, newTemplate.name, newTemplate.body);
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
export async function deleteTemplateFromDB(
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

// ─── Reminder Sent Persistence ──────────────────────────────────────────

/** Carrega o histórico de lembretes enviados do Supabase (últimos 7 dias) */
export async function loadRemindersFromDB(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select('client_id, sent_at')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false });

    if (error || !data) return {};

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
