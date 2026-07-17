import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResponsiveDateTimeStep from './ResponsiveDateTimeStep';
import type { Booking, Service } from '../../../types';

vi.mock('../../../lib/utils', () => ({
  getTimeSlotsForDate: vi.fn(() =>
    Promise.resolve([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ])
  ),
  isTimeOccupied: vi.fn((time: string, bookings: Booking[]) =>
    bookings.some((b) => b.status !== 'cancelled' && b.booking_time.slice(0, 5) === time)
  ),
  formatDisplayName: vi.fn((name: string) => name),
}));

vi.mock('../../../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

const mockDays = [
  { fullDate: '2026-07-03', dayName: 'QUI', dayNumber: 3 },
  { fullDate: '2026-07-04', dayName: 'SEX', dayNumber: 4 },
  { fullDate: '2026-07-05', dayName: 'SAB', dayNumber: 5 },
];

const mockServices: Service[] = [
  { id: '1', name: 'Corte', price: 40, duration: 30 },
  { id: '2', name: 'Barba', price: 25, duration: 20 },
];

const mockBookings: Booking[] = [
  {
    id: 'b1',
    client_id: '1',
    service_ids: ['1'],
    booking_date: '2026-07-03',
    booking_time: '10:00:00',
    status: 'confirmed',
    total_price: 40,
    total_duration: 30,
    created_at: '2026-07-01',
  },
];

describe('DesktopDateTimeStep', () => {
  const defaultProps = {
    nextDays: mockDays,
    selectedDate: '',
    selectedTime: '',
    existingBookings: mockBookings,
    onSelectDate: vi.fn(),
    onSelectTime: vi.fn(),
    onFinish: vi.fn(),
    isSubmitting: false,
    isStepValid: vi.fn(() => true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('quando nao esta pre-preenchido', () => {
    it('renderiza titulo de data e horario', () => {
      render(<ResponsiveDateTimeStep {...defaultProps} />);
      expect(screen.getByText('Data e Horário')).toBeInTheDocument();
    });

    it('renderiza botoes de dias', () => {
      render(<ResponsiveDateTimeStep {...defaultProps} />);
      expect(screen.getByText('QUI')).toBeInTheDocument();
      expect(screen.getByText('SEX')).toBeInTheDocument();
      expect(screen.getByText('SAB')).toBeInTheDocument();
    });

    it('mostra mensagem para selecionar dia quando nenhum selecionado', () => {
      render(<ResponsiveDateTimeStep {...defaultProps} />);
      expect(screen.getByText('Selecione um dia acima para ver os horários.')).toBeInTheDocument();
    });

    it('chama onSelectDate ao clicar em um dia', () => {
      const onSelectDate = vi.fn();
      render(<ResponsiveDateTimeStep {...defaultProps} onSelectDate={onSelectDate} />);
      fireEvent.click(screen.getByText('3'));
      expect(onSelectDate).toHaveBeenCalledWith('2026-07-03');
    });

    it('mostra slots de horario quando um dia e selecionado', async () => {
      render(<ResponsiveDateTimeStep {...defaultProps} selectedDate="2026-07-03" />);
      await waitFor(() => {
        expect(screen.getByText('08:00')).toBeInTheDocument();
      });
      expect(screen.getByText('18:00')).toBeInTheDocument();
    });

    it('chama onSelectTime ao clicar em um horario', async () => {
      const onSelectTime = vi.fn();
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          selectedDate="2026-07-03"
          onSelectTime={onSelectTime}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('09:00'));
      expect(onSelectTime).toHaveBeenCalledWith('09:00');
    });

    it('desabilita horario ocupado', async () => {
      render(<ResponsiveDateTimeStep {...defaultProps} selectedDate="2026-07-03" />);
      await waitFor(() => {
        expect(screen.getByText('10:00')).toBeInTheDocument();
      });
      const occupiedButton = screen.getByText('10:00');
      expect(occupiedButton).toBeDisabled();
    });
  });

  describe('quando esta pre-preenchido com data e horario', () => {
    it('renderiza titulo de confirmacao', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          clientName="João Silva"
          selectedServices={mockServices}
          totalPrice={65}
        />
      );
      expect(screen.getByRole('heading', { name: 'Confirmar Agendamento' })).toBeInTheDocument();
      expect(screen.getByText('Revise os dados antes de confirmar.')).toBeInTheDocument();
    });

    it('mostra nome do cliente', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          clientName="João Silva"
        />
      );
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    it('mostra data formatada', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
        />
      );
      expect(screen.getByText('03/07/2026')).toBeInTheDocument();
    });

    it('mostra horario selecionado', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
        />
      );
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('mostra servicos e precos', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          selectedServices={mockServices}
          totalPrice={65}
        />
      );
      expect(screen.getByText('Corte')).toBeInTheDocument();
      expect(screen.getByText('R$ 40')).toBeInTheDocument();
      expect(screen.getByText('Barba')).toBeInTheDocument();
      expect(screen.getByText('R$ 25')).toBeInTheDocument();
    });

    it('mostra total', () => {
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          selectedServices={mockServices}
          totalPrice={65}
        />
      );
      expect(screen.getByText('R$ 65')).toBeInTheDocument();
    });

    it('chama onFinish ao clicar em confirmar', () => {
      const onFinish = vi.fn();
      render(
        <ResponsiveDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          onFinish={onFinish}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamento' }));
      expect(onFinish).toHaveBeenCalled();
    });
  });

  describe('quando esta pre-preenchido sem data/horario', () => {
    it('renderiza visao normal do picker', () => {
      render(
        <ResponsiveDateTimeStep {...defaultProps} isPreFilled selectedDate="" selectedTime="" />
      );
      expect(screen.getByText('Data e Horário')).toBeInTheDocument();
      expect(screen.getByText('Selecione um dia acima para ver os horários.')).toBeInTheDocument();
    });
  });
});
