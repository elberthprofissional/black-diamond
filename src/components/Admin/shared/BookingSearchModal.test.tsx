import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingSearchModal from './BookingSearchModal';
import type { Client } from '../../types';

const mockClients: Client[] = [
  { id: '1', name: 'João Silva', phone: '31999999999', created_at: '2024-01-01' },
  { id: '2', name: 'Maria Santos', phone: '31988888888', created_at: '2024-01-01' },
  { id: '3', name: 'Pedro Oliveira', phone: '31977777777', created_at: '2024-01-01' },
];

describe('BookingSearchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectClient: vi.fn(),
    clients: mockClients,
  };

  it('renderiza quando aberto', () => {
    render(<BookingSearchModal {...defaultProps} />);
    expect(screen.getByText('Buscar Cliente')).toBeInTheDocument();
  });

  it('nao renderiza quando fechado', () => {
    render(<BookingSearchModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Buscar Cliente')).not.toBeInTheDocument();
  });

  it('renderiza lista de clientes', () => {
    render(<BookingSearchModal {...defaultProps} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Pedro Oliveira')).toBeInTheDocument();
  });

  it('filtra clientes por nome', () => {
    render(<BookingSearchModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Digite o nome ou número...');
    fireEvent.change(searchInput, { target: { value: 'João' } });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
  });

  it('filtra clientes por telefone', () => {
    render(<BookingSearchModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Digite o nome ou número...');
    fireEvent.change(searchInput, { target: { value: '999' } });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByText('Pedro Oliveira')).not.toBeInTheDocument();
  });

  it('chama onSelectClient ao clicar em um cliente', () => {
    const onSelectClient = vi.fn();
    render(<BookingSearchModal {...defaultProps} onSelectClient={onSelectClient} />);
    fireEvent.click(screen.getByText('João Silva'));
    expect(onSelectClient).toHaveBeenCalledWith(mockClients[0]);
  });

  it('chama onClose ao clicar no botao fechar', () => {
    const onClose = vi.fn();
    render(<BookingSearchModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Fechar busca'));
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra mensagem quando nenhum cliente encontrado', () => {
    render(<BookingSearchModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Digite o nome ou número...');
    fireEvent.change(searchInput, { target: { value: 'xyz123' } });
    expect(screen.getByText('Nenhum cliente encontrado')).toBeInTheDocument();
  });

  it('nao mostra clientes deletados', () => {
    const clientsWithDeleted = [
      ...mockClients,
      { id: '4', name: 'CLIENTE EXCLUIDO', phone: 'DELETED_123', created_at: '2024-01-01' },
    ];
    render(<BookingSearchModal {...defaultProps} clients={clientsWithDeleted} />);
    expect(screen.queryByText('CLIENTE EXCLUIDO')).not.toBeInTheDocument();
  });
});
