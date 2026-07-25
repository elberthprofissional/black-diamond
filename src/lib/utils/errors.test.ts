import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('returns friendly message for "Failed to fetch"', () => {
    const err = new Error('Failed to fetch');
    expect(getErrorMessage(err)).toBe('Sem conexão com o servidor. Verifique sua internet.');
  });

  it('returns friendly message for NetworkError', () => {
    const err = new Error('NetworkError');
    expect(getErrorMessage(err)).toBe('Erro de rede. Tente novamente.');
  });

  it('returns friendly message for JWT expired', () => {
    const err = new Error('JWT expired');
    expect(getErrorMessage(err)).toBe('Sessão expirada. Faça login novamente.');
  });

  it('returns friendly message for duplicate key', () => {
    const err = new Error('duplicate key value violates unique constraint');
    expect(getErrorMessage(err)).toBe('Este telefone já está cadastrado para outro cliente.');
  });

  it('returns friendly message for unique_violation', () => {
    const err = new Error('unique_violation');
    expect(getErrorMessage(err)).toBe('Este telefone já está cadastrado para outro cliente.');
  });

  it('returns specific message for horário preenchido', () => {
    const err = new Error('Este horário acabou de ser preenchido');
    expect(getErrorMessage(err)).toBe('Este horário acabou de ser preenchido. Escolha outro.');
  });

  it('returns specific message for limite de agendamentos', () => {
    const err = new Error('Limite de 3 agendamentos por dia atingido.');
    expect(getErrorMessage(err)).toBe('Limite de 3 agendamentos por dia atingido.');
  });

  it('returns validation messages starting with Informe', () => {
    const err = new Error('Informe o telefone do cliente');
    expect(getErrorMessage(err)).toBe('Informe o telefone do cliente');
  });

  it('returns original message when no mapping found', () => {
    const err = new Error('Erro desconhecido qualquer');
    expect(getErrorMessage(err)).toBe('Erro desconhecido qualquer');
  });

  it('handles non-Error input', () => {
    expect(getErrorMessage('string error')).toBe('Erro inesperado. Tente novamente.');
  });

  it('handles null input', () => {
    expect(getErrorMessage(null)).toBe('Erro inesperado. Tente novamente.');
  });

  it('handles undefined input', () => {
    expect(getErrorMessage(undefined)).toBe('Erro inesperado. Tente novamente.');
  });

  it('handles row-level security violation', () => {
    const err = new Error('new row violates row-level security');
    expect(getErrorMessage(err)).toBe('Sem permissão para esta ação.');
  });

  it('handles invalid input message', () => {
    const err = new Error('invalid input syntax for type');
    expect(getErrorMessage(err)).toBe('Dados inválidos. Verifique os campos.');
  });

  it('handles permission denied message', () => {
    const err = new Error('permission denied for table');
    expect(getErrorMessage(err)).toBe('Sem permissão para esta ação.');
  });

  it('returns default for Error with empty message', () => {
    const err = new Error('');
    expect(getErrorMessage(err)).toBe('Erro inesperado. Tente novamente.');
  });
});
