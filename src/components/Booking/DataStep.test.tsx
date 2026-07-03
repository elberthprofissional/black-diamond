import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataStep from './DataStep';

describe('DataStep', () => {
  const defaultProps = {
    name: '',
    phone: '',
    onNameChange: vi.fn(),
    onPhoneChange: vi.fn(),
    layout: 'desktop' as const,
    isMensalista: false,
    clientLookupLoading: false,
  };

  it('renderiza campos de nome e telefone no desktop', () => {
    render(<DataStep {...defaultProps} />);
    expect(screen.getByPlaceholderText('Digite seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeInTheDocument();
  });

  it('renderiza campos no mobile', () => {
    render(<DataStep {...defaultProps} layout="mobile" />);
    expect(screen.getByPlaceholderText('Digite seu nome...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 90000-0000')).toBeInTheDocument();
  });

  it('chama onNameChange ao digitar nome', () => {
    const onNameChange = vi.fn();
    render(<DataStep {...defaultProps} onNameChange={onNameChange} />);
    const input = screen.getByPlaceholderText('Digite seu nome completo');
    fireEvent.change(input, { target: { value: 'Teste' } });
    expect(onNameChange).toHaveBeenCalledWith('Teste');
  });

  it('chama onPhoneChange ao digitar telefone', () => {
    const onPhoneChange = vi.fn();
    render(<DataStep {...defaultProps} onPhoneChange={onPhoneChange} />);
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    fireEvent.change(input, { target: { value: '31999999999' } });
    expect(onPhoneChange).toHaveBeenCalled();
  });

  it('mostra erro quando nome tem menos de 3 caracteres', () => {
    render(<DataStep {...defaultProps} name="Ab" />);
    expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
  });

  it('mostra erro quando telefone invalido', () => {
    render(<DataStep {...defaultProps} phone="123" />);
    expect(screen.getByText('Informe um WhatsApp válido com DDD')).toBeInTheDocument();
  });

  it('mostra badge de mensalista', () => {
    render(<DataStep {...defaultProps} isMensalista={true} />);
    expect(screen.getByText('Mensalista')).toBeInTheDocument();
  });

  it('mostra loading quando verificando', () => {
    render(<DataStep {...defaultProps} clientLookupLoading={true} />);
    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });
});
