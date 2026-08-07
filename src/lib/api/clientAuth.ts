import { supabase } from '../supabase';

/** Resolve um identificador (nome, telefone ou e-mail) para um profissional. */
export interface ResolvedProfessional {
  email: string;
  name: string;
  phone: string;
}

export type ResolverResult =
  | { type: 'profissional'; email: string; name: string; phone: string }
  | { type: 'ambiguous'; matches: ResolvedProfessional[] }
  | { type: 'none' };

export const resolverLoginProfissional = async (identifier: string): Promise<ResolverResult> => {
  const { data, error } = await supabase.rpc('resolver_login_profissional', {
    p_identifier: identifier.trim(),
  });
  if (error) throw error;
  return (data as ResolverResult) || { type: 'none' };
};

/** Busca clientes pelo nome (com desambiguação). */
export interface ClientMatch {
  id: string;
  name: string;
  phone: string;
  phone_masked: string;
  has_password: boolean;
}

export const buscarClientesPorNome = async (name: string): Promise<ClientMatch[]> => {
  const { data, error } = await supabase.rpc('buscar_cliente_por_nome', {
    p_nome: name.trim(),
  });
  if (error) throw error;
  return (data as ClientMatch[]) || [];
};

/** Verifica a senha de um cliente pelo telefone. */
export interface ClientPasswordStatus {
  ok: boolean;
  needs_password?: boolean;
  name?: string;
  phone?: string;
  client_id?: string;
  message?: string;
}

export const verificarSenhaCliente = async (
  phone: string,
  password: string
): Promise<ClientPasswordStatus> => {
  const { data, error } = await supabase.rpc('verificar_senha_cliente', {
    p_phone: phone.replace(/\D/g, ''),
    p_password: password,
  });
  if (error) throw error;
  return (data as ClientPasswordStatus) || { ok: false };
};

/** Cria (ou altera) a senha de um cliente pelo telefone. */
export const criarSenhaCliente = async (
  phone: string,
  password: string
): Promise<{ ok: boolean; message?: string; name?: string }> => {
  const { data, error } = await supabase.rpc('criar_senha_cliente', {
    p_phone: phone.replace(/\D/g, ''),
    p_password: password,
  });
  if (error) throw error;
  return (data as { ok: boolean; message?: string; name?: string }) || { ok: false };
};
