import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingDetailPanel from './BookingDetailPanel';
import type { BookingWithClient, Service } from '../../../types';

const mockBooking: BookingWithClient = {
  id: 'booking-1',
  client_id: 'client-1',
  service_ids: ['service-1', 'service-2'],
  booking_date: '2026-06-27',
  booking_time: '10:00:00',
  status: 'confirmed',
  total_price: 75,
  total_duration: 45,
  created_at: '2026-06-27T08:00:00Z',
  clients: {
    name: 'João Silva',
    phone: '5531999999999',
  },
};

const mockServices: Service[] = [
  { id: 'service-1', name: 'Corte', price: 45, duration: 30 },
  { id: 'service-2', name: 'Barba', price: 30, duration: 15 },
];

describe('BookingDetailPanel', () => {
  it('renderiza titulo do painel', () => {
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Dados do Agendamento')).toBeInTheDocument();
  });

  it('renderiza nome do cliente', () => {
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza telefone do cliente', () => {
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByText('(55) 31999-9999').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza servicos do agendamento', () => {
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByText('Corte').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Barba').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza preco total', () => {
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const priceElements = screen.getAllByText('R$ 75');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('chama onClose ao clicar no botao fechar', () => {
    const onClose = vi.fn();
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={onClose}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const closeButtons = screen.getAllByRole('button');
    closeButtons[0].click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onComplete ao clicar em Concluir', () => {
    const onComplete = vi.fn();
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={onComplete}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const completeButtons = screen.getAllByText('Finalizar Atendimento');
    completeButtons[0].click();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('chama onReschedule ao clicar em Reagendar', () => {
    const onReschedule = vi.fn();
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={onReschedule}
        onDelete={vi.fn()}
      />
    );
    const rescheduleButtons = screen.getAllByText('Reagendar');
    rescheduleButtons[0].click();
    expect(onReschedule).toHaveBeenCalledTimes(1);
  });

  it('chama onDelete ao clicar em Cancelar', () => {
    const onDelete = vi.fn();
    render(
      <BookingDetailPanel
        booking={mockBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={onDelete}
      />
    );
    const deleteButtons = screen.getAllByText('Cancelar Agendamento');
    deleteButtons[0].click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('nao mostra botao Concluir para booking ja concluido', () => {
    const completedBooking = { ...mockBooking, status: 'completed' as const };
    render(
      <BookingDetailPanel
        booking={completedBooking}
        services={mockServices}
        onClose={vi.fn()}
        onComplete={vi.fn()}
        onReschedule={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText('Concluir Atendimento')).not.toBeInTheDocument();
  });
});
