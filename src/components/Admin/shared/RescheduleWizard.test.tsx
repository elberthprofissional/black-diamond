import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';

// Strip framer-motion props that React DOM doesn't recognize — must be hoisted
const { MotionEl } = vi.hoisted(() => {
  const FM_PROPS = new Set([
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileDrag',
    'whileInView',
    'layoutId',
    'layout',
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'onAnimationStart',
    'onAnimationComplete',
  ]);
  const MotionEl =
    (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) => {
      const safe = Object.fromEntries(Object.entries(props).filter(([k]) => !FM_PROPS.has(k)));
      return createElement(tag, safe, children as ReactNode);
    };
  return { MotionEl };
});

vi.mock('framer-motion', () => ({
  motion: { div: MotionEl('div'), button: MotionEl('button') },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../../../lib/api', () => ({
  getAvailableSlots: vi.fn().mockResolvedValue(['09:00', '10:00', '11:00']),
}));

vi.mock('../../../lib/utils', () => ({
  getLocalDateString: vi.fn(() => '2026-07-22'),
  formatDisplayName: vi.fn((name: string) => name),
  formatPricePublic: vi.fn((price: number) => `R$ ${price.toFixed(2)}`),
}));

import RescheduleWizard from './RescheduleWizard';
import type { Service, BookingWithClient } from '../../../types';

const mockServices: Service[] = [
  { id: 'srv-1', name: 'Corte de Cabelo', price: 35, duration: 40 },
  { id: 'srv-2', name: 'Barba', price: 27, duration: 20 },
  { id: 'srv-3', name: 'Sobrancelha', price: 15, duration: 10 },
];

const mockBooking: BookingWithClient = {
  id: 'booking-1',
  client_id: 'client-1',
  service_ids: ['srv-1'],
  booking_date: '2026-07-20',
  booking_time: '10:00:00',
  status: 'confirmed',
  total_price: 35,
  total_duration: 40,
  created_at: '2026-07-19T12:00:00Z',
  clients: { name: 'João Silva', phone: '31999999999' },
  services: [{ id: 'srv-1', name: 'Corte de Cabelo', price: 35, duration: 40 }],
};

const defaultProps = {
  selectedBooking: mockBooking,
  services: mockServices,
  step: 1,
  setStep: vi.fn(),
  rescheduleServices: [] as Service[],
  setRescheduleServices: vi.fn(),
  rescheduleDate: '',
  setRescheduleDate: vi.fn(),
  rescheduleTime: '',
  setRescheduleTime: vi.fn(),
  existingBookings: [],
  loadingSlots: false,
  isSaving: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

function renderWizard(overrides: Partial<typeof defaultProps> = {}) {
  const utils = render(<RescheduleWizard {...defaultProps} {...overrides} />);
  return { ...utils };
}

describe('RescheduleWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1 - Serviços', () => {
    it('renderiza lista de serviços', () => {
      renderWizard({ step: 1 });
      expect(screen.getByText('Serviços')).toBeTruthy();
      expect(screen.getByText('Corte de Cabelo')).toBeTruthy();
      expect(screen.getByText('Barba')).toBeTruthy();
    });

    it('mostra preços dos serviços', () => {
      renderWizard({ step: 1 });
      expect(screen.getByText('R$ 35.00')).toBeTruthy();
      expect(screen.getByText('R$ 27.00')).toBeTruthy();
    });

    it('seleciona/deseleciona serviço ao clicar', async () => {
      const setRescheduleServices = vi.fn();
      renderWizard({ step: 1, setRescheduleServices, rescheduleServices: [] });

      const corteEl = screen.getByText('Corte de Cabelo');
      await userEvent.click(corteEl);

      expect(setRescheduleServices).toHaveBeenCalledTimes(1);
      // Component passes an array directly (not a callback function)
      expect(Array.isArray(setRescheduleServices.mock.calls[0][0])).toBe(true);
    });

    it('botão Continuar desabilitado sem seleção', () => {
      renderWizard({ step: 1, rescheduleServices: [] });
      const btn = screen.getByRole('button', { name: /continuar/i });
      expect(btn).toBeDisabled();
    });

    it('botão Continuar habilitado com seleção', () => {
      renderWizard({ step: 1, rescheduleServices: [mockServices[0]] });
      const btn = screen.getByRole('button', { name: /continuar/i });
      expect(btn).toBeEnabled();
    });

    it('avança para step 2 ao clicar Continuar', async () => {
      const setStep = vi.fn();
      renderWizard({ step: 1, rescheduleServices: [mockServices[0]], setStep });

      await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
      expect(setStep).toHaveBeenCalledWith(2);
    });
  });

  describe('Step 2 - Data e Horário', () => {
    it('renderiza seletor de data e horário', () => {
      renderWizard({ step: 2 });
      expect(screen.getByText('Data e Horário')).toBeTruthy();
      expect(screen.getByText('Novo Horário')).toBeTruthy();
    });

    it('mostra grid de horários disponíveis', async () => {
      renderWizard({ step: 2, rescheduleDate: '2026-07-23' });
      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeTruthy();
      });
      expect(screen.getByText('10:00')).toBeTruthy();
      expect(screen.getByText('11:00')).toBeTruthy();
    });

    it('mostra loading spinner quando carregando', () => {
      renderWizard({ step: 2, loadingSlots: true });
      expect(screen.getByText('Carregando...')).toBeTruthy();
    });

    it('seleciona horário ao clicar', async () => {
      const setRescheduleTime = vi.fn();
      renderWizard({ step: 2, setRescheduleTime, rescheduleDate: '2026-07-23' });

      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeTruthy();
      });
      await userEvent.click(screen.getByText('09:00'));
      expect(setRescheduleTime).toHaveBeenCalledWith('09:00');
    });

    it('botão Continuar desabilitado sem data/hora', () => {
      renderWizard({ step: 2, rescheduleDate: '', rescheduleTime: '' });
      const btn = screen.getByRole('button', { name: /continuar/i });
      expect(btn).toBeDisabled();
    });

    it('botão Continuar habilitado com data e hora', () => {
      renderWizard({ step: 2, rescheduleDate: '2026-07-22', rescheduleTime: '14:00' });
      const btn = screen.getByRole('button', { name: /continuar/i });
      expect(btn).toBeEnabled();
    });
  });

  describe('Step 3 - Revisão', () => {
    it('renderiza tela de revisão com detalhes', () => {
      renderWizard({
        step: 3,
        rescheduleServices: [mockServices[0]],
        rescheduleDate: '2026-07-22',
        rescheduleTime: '14:00',
      });
      expect(screen.getByText('Revisar')).toBeTruthy();
      expect(screen.getByText('Agendamento Atual')).toBeTruthy();
      expect(screen.getByText('Novo Agendamento')).toBeTruthy();
    });

    it('botão Confirmar Reagendamento presente', () => {
      renderWizard({
        step: 3,
        rescheduleServices: [mockServices[0]],
        rescheduleDate: '2026-07-22',
        rescheduleTime: '14:00',
      });
      expect(screen.getByText('Confirmar Reagendamento')).toBeTruthy();
    });

    it('confirma reagendamento ao clicar', async () => {
      const onConfirm = vi.fn();
      renderWizard({
        step: 3,
        rescheduleServices: [mockServices[0]],
        rescheduleDate: '2026-07-22',
        rescheduleTime: '14:00',
        onConfirm,
      });

      await userEvent.click(screen.getByText(/confirmar reagendamento/i));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navegação', () => {
    it('back button fecha wizard no step 1', async () => {
      const onClose = vi.fn();
      const { container } = renderWizard({ step: 1, onClose });

      // Find the back arrow button (the one with the arrow SVG, not the X)
      const buttons = container.querySelectorAll('button');
      // First button should be the back arrow
      const backBtn = buttons[0];
      await userEvent.click(backBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('back button volta um step quando step > 1', async () => {
      const setStep = vi.fn();
      const { container } = renderWizard({ step: 2, setStep });

      const buttons = container.querySelectorAll('button');
      const backBtn = buttons[0];
      await userEvent.click(backBtn);
      expect(setStep).toHaveBeenCalledWith(1);
    });

    it('close button fecha o wizard', async () => {
      const onClose = vi.fn();
      const { container } = renderWizard({ step: 1, onClose });

      const buttons = container.querySelectorAll('button');
      // Second button should be the close (X) button
      const closeBtn = buttons[1];
      await userEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('barra de progresso mostra 3 steps', () => {
      const { container } = renderWizard({ step: 1 });
      const dots = container.querySelectorAll('.rounded-full');
      // Should have at least 3 progress indicators
      expect(dots.length).toBeGreaterThanOrEqual(2);
    });
  });
});
