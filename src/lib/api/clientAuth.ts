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

// ──────────────────────────────────────────────────────────────
// Conta do cliente v2 — recuperação, criar conta e login por e-mail
// ──────────────────────────────────────────────────────────────

export interface LoginClienteResult {
  ok: boolean;
  name?: string;
  phone?: string;
  needs_password?: boolean;
  message?: string;
}

/** Login por telefone OU e-mail + senha (RPC verificar_login_cliente). */
export const verificarLoginCliente = async (
  identifier: string,
  password: string
): Promise<LoginClienteResult> => {
  const { data, error } = await supabase.rpc('verificar_login_cliente', {
    p_identifier: identifier.trim(),
    p_password: password,
  });
  if (error) throw error;
  return (data as LoginClienteResult) || { ok: false };
};

export interface CriarContaResult {
  ok: boolean;
  message?: string;
  name?: string;
  phone?: string;
  client_id?: string;
}

/** Cria uma conta completa (nome + e-mail + telefone + senha). Herda histórico se o telefone já existe. */
export const criarContaCliente = async (input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<CriarContaResult> => {
  const { data, error } = await supabase.rpc('criar_conta_cliente', {
    p_nome: input.name.trim(),
    p_email: input.email.trim(),
    p_telefone: input.phone.replace(/\D/g, ''),
    p_senha: input.password,
  });
  if (error) throw error;
  return (data as CriarContaResult) || { ok: false };
};

export interface RecuperacaoResult {
  ok: boolean;
  message?: string;
  name?: string;
  phone?: string;
  email_masked?: string;
  needs_password?: boolean;
  no_email?: boolean;
  mailer_not_configured?: boolean;
}

/** Pede o código de recuperação (edge function envia o e-mail). */
export const solicitarRecuperacaoCliente = async (
  identifier: string
): Promise<RecuperacaoResult> => {
  const { data, error } = await supabase.functions.invoke('cliente-recuperar-senha', {
    body: { identifier: identifier.trim() },
  });
  if (error) throw error;
  return (data as RecuperacaoResult) || { ok: false, message: 'Erro ao solicitar recuperação.' };
};

/** Redefine a senha usando o código recebido por e-mail. */
export const redefinirSenhaCliente = async (
  phone: string,
  token: string,
  novaSenha: string
): Promise<{ ok: boolean; message?: string }> => {
  const { data, error } = await supabase.rpc('redefinir_senha_cliente', {
    p_phone: phone.replace(/\D/g, ''),
    p_token: token.trim(),
    p_nova_senha: novaSenha,
  });
  if (error) throw error;
  return (data as { ok: boolean; message?: string }) || { ok: false };
};

/** Atualiza o e-mail do cliente (dashboard). */
export const atualizarEmailCliente = async (
  phone: string,
  email: string
): Promise<{ ok: boolean; message?: string }> => {
  const { data, error } = await supabase.rpc('atualizar_email_cliente', {
    p_phone: phone.replace(/\D/g, ''),
    p_email: email.trim(),
  });
  if (error) throw error;
  return (data as { ok: boolean; message?: string }) || { ok: false };
};

/** Troca a senha (exige a senha atual). */
export const alterarSenhaCliente = async (
  phone: string,
  senhaAtual: string,
  novaSenha: string
): Promise<{ ok: boolean; message?: string }> => {
  const { data, error } = await supabase.rpc('alterar_senha_cliente', {
    p_phone: phone.replace(/\D/g, ''),
    p_senha_atual: senhaAtual,
    p_nova_senha: novaSenha,
  });
  if (error) throw error;
  return (data as { ok: boolean; message?: string }) || { ok: false };
};

/** Admin: remove a senha do cliente (ele entra sem senha e cria outra). */
export const limparSenhaClienteAdmin = async (
  clientId: string
): Promise<{ ok: boolean; message?: string; name?: string }> => {
  const { data, error } = await supabase.rpc('limpar_senha_cliente', {
    p_client_id: clientId,
  });
  if (error) throw error;
  return (data as { ok: boolean; message?: string; name?: string }) || { ok: false };
};
