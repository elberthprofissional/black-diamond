const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  NetworkError: 'Erro de rede. Tente novamente.',
  'invalid input': 'Dados inválidos. Verifique os campos.',
  'permission denied': 'Sem permissão para esta ação.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
  'new row violates row-level security': 'Sem permissão para esta ação.',
  'row-level security': 'Sem permissão para esta ação.',
  'violates foreign key': 'Erro de integridade dos dados.',
  'duplicate key': 'Este telefone já está cadastrado para outro cliente.',
  unique_violation: 'Este telefone já está cadastrado para outro cliente.',
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('horário acabou de ser preenchido')) {
      return 'Este horário acabou de ser preenchido. Escolha outro.';
    }
    if (msg.includes('Limite de 3 agendamentos')) {
      return 'Limite de 3 agendamentos por dia atingido.';
    }
    if (msg.includes('Informe')) return msg; // client-side validation messages
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (msg.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return msg || 'Erro inesperado. Tente novamente.';
  }
  return 'Erro inesperado. Tente novamente.';
};
