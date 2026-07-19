/** Magic phone number used for blocked/occupied slots (no real client) */
export const BLOCKED_PHONE = '00000000000';

/** Magic client name used for blocked/occupied slots */
export const BLOCKED_NAME = 'BLOQUEADO';

/** Null UUID used as a sentinel in delete operations */
export const NULL_UUID = '00000000-0000-0000-0000-000000000000';

/** Days without visit to consider a client inactive */
export const INACTIVE_DAYS = 30;

/**
 * Services excluded from mensalista subscription pricing.
 * This is a FALLBACK used when the client's plan doesn't have
 * explicit included_service_ids configured.
 * Ideally, each mensalista_plan defines its own included_service_ids in the DB.
 */
export const MENSALISTA_EXCLUDED_SERVICES = ['Corte de Cabelo'];

// ─── localStorage Keys ───
/** Chave para armazenar histórico de lembretes enviados */
export const STORAGE_REMINDERS_SENT = 'barber_reminders_sent';
/** Chave para armazenar templates de lembretes */
export const STORAGE_REMINDER_TEMPLATES = 'barber_templates';
/** Chave para cache de serviços */
export const STORAGE_SERVICES_CACHE = 'barber_services_cache';
/** Chave para marcar que o PWA foi instalado */
export const STORAGE_PWA_INSTALLED = 'barber_pwa_installed';
/** Prefixo para chaves de rate limit */
export const STORAGE_RATELIMIT_PREFIX = 'ratelimit_';
