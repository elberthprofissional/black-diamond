import { supabase } from '../supabase';

export interface LoginCheckResult {
  allowed: boolean;
  reason: string | null;
}

/**
 * Verifica se um email tem permissão para fazer login.
 * Consulta a RPC `check_login_allowed` no Supabase que valida:
 *  - Se o email é do dono (sempre liberado)
 *  - Se o email está na lista de bloqueados por pagamento
 *
 * @param email - Email do usuário tentando fazer login
 * @returns { allowed: boolean, reason: string | null }
 */
export async function checkLoginAllowed(email: string): Promise<LoginCheckResult> {
  const { data, error } = await supabase.rpc('check_login_allowed', {
    p_email: email.trim().toLowerCase(),
  });

  if (error) {
    // Se a RPC falhar (ex: migration não rodou), permite login como fallback
    console.warn('[checkLoginAllowed] RPC failed, allowing login as fallback:', error.message);
    return { allowed: true, reason: null };
  }

  return {
    allowed: data?.allowed ?? true,
    reason: data?.reason ?? null,
  };
}
