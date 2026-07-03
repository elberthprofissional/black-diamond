import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileDateTimeStep from './MobileDateTimeStep';
import type { Booking, Service } from '../../../types';

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
  { id: 'b1', client_id: '1', service_ids: ['1'], booking_date: '2026-07-03', booking_time: '10:00:00', status: 'confirmed', total_price: 40, total_duration: 30, created_at: '2026-07-01' },
];

describe('MobileDateTimeStep', () => {
  const defaultProps = {
    nextDays: mockDays,
    selectedDate: '',
    selectedTime: '',
    existingBookings: mockBookings,
    onSelectDate: vi.fn(),
    onSelectTime: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('quando nao esta pre-preenchido', () => {
    it('renderiza titulo de data e horario', () => {
      render(<MobileDateTimeStep {...defaultProps} />);
      expect(screen.getByText('Data e horário')).toBeInTheDocument();
    });

    it('renderiza instrucao de selecao', () => {
      render(<MobileDateTimeStep {...defaultProps} />);
      expect(screen.getByText('Selecione o melhor dia e horário')).toBeInTheDocument();
    });

    it('renderiza botoes de dias', () => {
      render(<MobileDateTimeStep {...defaultProps} />);
      expect(screen.getByText('QUI')).toBeInTheDocument();
      expect(screen.getByText('SEX')).toBeInTheDocument();
      expect(screen.getByText('SAB')).toBeInTheDocument();
    });

    it('mostra mensagem para selecionar dia quando nenhum selecionado', () => {
      render(<MobileDateTimeStep {...defaultProps} />);
      expect(screen.getByText('Selecione um dia acima para ver os horários.')).toBeInTheDocument();
    });

    it('chama onSelectDate ao clicar em um dia', () => {
      const onSelectDate = vi.fn();
      render(<MobileDateTimeStep {...defaultProps} onSelectDate={onSelectDate} />);
      fireEvent.click(screen.getByText('3'));
      expect(onSelectDate).toHaveBeenCalledWith('2026-07-03');
    });

    it('mostra slots de horario quando um dia e selecionado', () => {
      render(<MobileDateTimeStep {...defaultProps} selectedDate="2026-07-03" />);
      expect(screen.getByText('08:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
    });

    it('chama onSelectTime ao clicar em um horario', () => {
      const onSelectTime = vi.fn();
      render(<MobileDateTimeStep {...defaultProps} selectedDate="2026-07-03" onSelectTime={onSelectTime} />);
      fireEvent.click(screen.getByText('09:00'));
      expect(onSelectTime).toHaveBeenCalledWith('09:00');
    });

    it('desabilita horario ocupado', () => {
      render(<MobileDateTimeStep {...defaultProps} selectedDate="2026-07-03" />);
      const occupiedButton = screen.getByText('10:00');
      expect(occupiedButton).toBeDisabled();
    });
  });

  describe('quando esta pre-preenchido com data e horario', () => {
    it('renderiza titulo de confirmacao', () => {
      render(
        <MobileDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate="2026-07-03"
          selectedTime="10:00"
          clientName="João Silva"
          selectedServices={mockServices}
          totalPrice={65}
        />
      );
      expect(screen.getByText('Confirmar')).toBeInTheDocument();
      expect(screen.getByText('Revise os dados antes de confirmar')).toBeInTheDocument();
    });

    it('mostra nome do cliente', () => {
      render(
        <MobileDateTimeStep
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
        <MobileDateTimeStep
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
        <MobileDateTimeStep
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
        <MobileDateTimeStep
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
        <MobileDateTimeStep
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
  });

  describe('quando esta pre-preenchido sem data/horario', () => {
    it('renderiza visao normal do picker', () => {
      render(
        <MobileDateTimeStep
          {...defaultProps}
          isPreFilled
          selectedDate=""
          selectedTime=""
        />
      );
      expect(screen.getByText('Data e horário')).toBeInTheDocument();
      expect(screen.getByText('Selecione um dia acima para ver os horários.')).toBeInTheDocument();
    });
  });
});
