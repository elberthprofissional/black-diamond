/** Magic phone number used for blocked/occupied slots (no real client) */
export const BLOCKED_PHONE = '00000000000';

/** Magic client name used for blocked/occupied slots */
export const BLOCKED_NAME = 'BLOQUEADO';

/** Days without visit to consider a client inactive */
export const INACTIVE_DAYS = 30;

// ─── localStorage Keys ───
/** Chave para armazenar histórico de lembretes enviados */
export const STORAGE_REMINDERS_SENT = 'barber_reminders_sent';
/** Chave para armazenar templates de lembretes */
export const STORAGE_REMINDER_TEMPLATES = 'barber_templates';
/** Chave para cache de serviços */
export const STORAGE_SERVICES_CACHE = 'barber_services_cache';
/** Chave para marcar que o PWA foi instalado */
export const STORAGE_PWA_INSTALLED = 'barber_pwa_installed';
/** Chave para cache offline de agendamentos do dia */
export const STORAGE_BOOKINGS_CACHE = 'barber_bookings_cache';
/** Chave para sessão do cliente no ClientProfile */
export const STORAGE_CLIENT_SESSION = 'bd_client_session';
