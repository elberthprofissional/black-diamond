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

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => vi.fn() };
});

import FreePanel from './FreePanel';

const defaultProps = {
  freeSlots: [] as string[],
  selectedDate: '2026-07-22',
  blockingSlot: null as string | null,
  blockingDay: false,
  onBlockSlot: vi.fn(),
  onBlockDay: vi.fn(),
};

function renderPanel(overrides = {}) {
  return render(<FreePanel {...defaultProps} {...overrides} />);
}

describe('FreePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no free slots', () => {
    renderPanel();
    expect(screen.getByText('Nenhum horário livre')).toBeTruthy();
  });

  it('renders free slots with correct times', () => {
    renderPanel({ freeSlots: ['09:00', '10:00'] });
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('renders "Bloquear Dia Inteiro" button', () => {
    renderPanel({ freeSlots: ['09:00'] });
    expect(screen.getByText('Bloquear Dia Inteiro')).toBeTruthy();
  });

  it('calls onBlockDay when clicking the day button', () => {
    const onBlockDay = vi.fn();
    renderPanel({ freeSlots: ['09:00'], onBlockDay });
    fireEvent.click(screen.getByText('Bloquear Dia Inteiro'));
    expect(onBlockDay).toHaveBeenCalledTimes(1);
  });

  it('disables day button when blockingDay is true', () => {
    renderPanel({ freeSlots: ['09:00'], blockingDay: true });
    const btn = screen.getByText('Bloquear Dia Inteiro').closest('button');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('shows spinner when blockingDay is true', () => {
    renderPanel({ freeSlots: ['09:00'], blockingDay: true });
    const btn = screen.getByText('Bloquear Dia Inteiro').closest('button');
    const spinner = btn?.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('calls onBlockSlot with correct slot', () => {
    const onBlockSlot = vi.fn();
    renderPanel({ freeSlots: ['09:00', '10:00'], onBlockSlot });
    const blockBtns = screen.getAllByText('Bloquear');
    fireEvent.click(blockBtns[0]);
    expect(onBlockSlot).toHaveBeenCalledWith('09:00');
  });

  it('shows "..." when blockingSlot matches', () => {
    renderPanel({ freeSlots: ['09:00', '10:00'], blockingSlot: '09:00' });
    expect(screen.getByText('...')).toBeTruthy();
    // Second slot still shows "Bloquear"
    expect(screen.getByText('Bloquear')).toBeTruthy();
  });

  it('each slot has correct aria-label', () => {
    renderPanel({ freeSlots: ['09:00'] });
    expect(screen.getByLabelText('Bloquear horario 09:00')).toBeTruthy();
    expect(screen.getByLabelText('Agendar no horario 09:00')).toBeTruthy();
  });
});
