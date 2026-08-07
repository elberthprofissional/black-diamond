import { STORAGE_CLIENT_SESSION } from './constants';

/** Sessão salva no dispositivo do cliente (7 dias de validade). */
export interface ClientSession {
  phone: string;
  name: string;
  /** Cliente criou uma senha? (controla o convite "Proteger meu acesso" no dashboard) */
  hasPassword?: boolean;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function read(): { phone: string; name: string; hasPassword?: boolean; expiresAt: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_CLIENT_SESSION);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed.phone === 'string' && typeof parsed.expiresAt === 'number') {
      return parsed;
    }
    localStorage.removeItem(STORAGE_CLIENT_SESSION);
  } catch {
    localStorage.removeItem(STORAGE_CLIENT_SESSION);
  }
  return null;
}

/** Retorna a sessão válida do cliente, ou null se expirada/inexistente. */
export function getClientSession(): ClientSession | null {
  const session = read();
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    localStorage.removeItem(STORAGE_CLIENT_SESSION);
    return null;
  }
  return { phone: session.phone, name: session.name, hasPassword: session.hasPassword };
}

/** Salva (ou renova) a sessão do cliente. */
export function saveClientSession(phone: string, name: string, hasPassword?: boolean) {
  try {
    localStorage.setItem(
      STORAGE_CLIENT_SESSION,
      JSON.stringify({ phone, name, hasPassword, expiresAt: Date.now() + SESSION_TTL_MS })
    );
  } catch {
    /* noop */
  }
}

/** Remove a sessão do cliente (logout). */
export function clearClientSession() {
  try {
    localStorage.removeItem(STORAGE_CLIENT_SESSION);
  } catch {
    /* noop */
  }
}
