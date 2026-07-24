import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) =>
      createElement('div', props, children as ReactNode),
    button: ({ children, ...props }: Record<string, unknown>) =>
      createElement('button', props, children as ReactNode),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

import BlockedPanel from './BlockedPanel';
import type { BookingWithClient } from '../../../types';

const mockBookings: BookingWithClient[] = [
  {
    id: 'b1',
    client_id: 'c1',
    service_ids: ['s1'],
    booking_date: '2026-07-22',
    booking_time: '10:00:00',
    status: 'confirmed',
    total_price: 50,
    total_duration: 30,
    created_at: '2026-07-22T08:00:00Z',
    clients: { name: 'João', phone: '31999999999' },
  },
  {
    id: 'b2',
    client_id: 'c2',
    service_ids: ['s2'],
    booking_date: '2026-07-22',
    booking_time: '11:00:00',
    status: 'confirmed',
    total_price: 40,
    total_duration: 20,
    created_at: '2026-07-22T08:00:00Z',
    clients: { name: 'Maria', phone: '31988888888' },
  },
];

const defaultProps = {
  blockedBookings: [] as BookingWithClient[],
  blockingDay: false,
  onUnblock: vi.fn(),
  onUnblockDay: vi.fn(),
};

function renderPanel(overrides = {}) {
  return render(<BlockedPanel {...defaultProps} {...overrides} />);
}

describe('BlockedPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no blocked bookings', () => {
    renderPanel();
    expect(screen.getByText('Nenhum horário bloqueado')).toBeTruthy();
  });

  it('renders blocked bookings with correct times', () => {
    renderPanel({ blockedBookings: mockBookings });
    expect(screen.getByText('10:00')).toBeTruthy();
    expect(screen.getByText('11:00')).toBeTruthy();
  });

  it('renders "Liberar Dia Inteiro" button', () => {
    renderPanel({ blockedBookings: mockBookings });
    expect(screen.getByText('Liberar Dia Inteiro')).toBeTruthy();
  });

  it('calls onUnblockDay when clicking the day button', () => {
    const onUnblockDay = vi.fn();
    renderPanel({ blockedBookings: mockBookings, onUnblockDay });
    fireEvent.click(screen.getByText('Liberar Dia Inteiro'));
    expect(onUnblockDay).toHaveBeenCalledTimes(1);
  });

  it('disables day button when blockingDay is true', () => {
    renderPanel({ blockedBookings: mockBookings, blockingDay: true });
    const btn = screen.getByText('Liberar Dia Inteiro').closest('button');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('shows spinner when blockingDay is true', () => {
    renderPanel({ blockedBookings: mockBookings, blockingDay: true });
    const btn = screen.getByText('Liberar Dia Inteiro').closest('button');
    const spinner = btn?.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('calls onUnblock with correct booking when clicking "Desbloquear"', () => {
    const onUnblock = vi.fn();
    renderPanel({ blockedBookings: mockBookings, onUnblock });
    const buttons = screen.getAllByText('Desbloquear');
    fireEvent.click(buttons[0]);
    expect(onUnblock).toHaveBeenCalledWith(mockBookings[0]);
  });

  it('each unblock button has correct aria-label', () => {
    renderPanel({ blockedBookings: mockBookings });
    expect(screen.getByLabelText('Desbloquear horario 10:00')).toBeTruthy();
    expect(screen.getByLabelText('Desbloquear horario 11:00')).toBeTruthy();
  });
});
