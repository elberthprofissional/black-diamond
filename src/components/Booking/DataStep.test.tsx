import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

  const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renderiza campos de nome e telefone no desktop', () => {
    renderWithRouter(<DataStep {...defaultProps} />);
    expect(screen.getByPlaceholderText('Digite seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 00000-0000')).toBeInTheDocument();
  });

  it('renderiza campos no mobile', () => {
    renderWithRouter(<DataStep {...defaultProps} layout="mobile" />);
    expect(screen.getByPlaceholderText('Digite seu nome...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(00) 90000-0000')).toBeInTheDocument();
  });

  it('chama onNameChange ao digitar nome', () => {
    const onNameChange = vi.fn();
    renderWithRouter(<DataStep {...defaultProps} onNameChange={onNameChange} />);
    const input = screen.getByPlaceholderText('Digite seu nome completo');
    fireEvent.change(input, { target: { value: 'Teste' } });
    expect(onNameChange).toHaveBeenCalledWith('Teste');
  });

  it('chama onPhoneChange ao digitar telefone', () => {
    const onPhoneChange = vi.fn();
    renderWithRouter(<DataStep {...defaultProps} onPhoneChange={onPhoneChange} />);
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    fireEvent.change(input, { target: { value: '31999999999' } });
    expect(onPhoneChange).toHaveBeenCalled();
  });

  it('mostra erro quando nome tem menos de 3 caracteres', () => {
    renderWithRouter(<DataStep {...defaultProps} name="Ab" />);
    const input = screen.getByPlaceholderText('Digite seu nome completo');
    fireEvent.blur(input);
    expect(screen.getByText('Mínimo 3 caracteres')).toBeInTheDocument();
  });

  it('mostra erro quando telefone invalido', () => {
    renderWithRouter(<DataStep {...defaultProps} phone="123" />);
    const input = screen.getByPlaceholderText('(00) 00000-0000');
    fireEvent.blur(input);
    expect(screen.getByText('Informe DDD + número (mín. 10 dígitos)')).toBeInTheDocument();
  });

  it('mostra badge de mensalista', () => {
    renderWithRouter(<DataStep {...defaultProps} isMensalista={true} />);
    expect(screen.getByText('Mensalista')).toBeInTheDocument();
  });

  it('mostra loading quando verificando', () => {
    renderWithRouter(<DataStep {...defaultProps} clientLookupLoading={true} />);
    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });
});
