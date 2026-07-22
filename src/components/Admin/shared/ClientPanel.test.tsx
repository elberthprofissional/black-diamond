import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

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
  return {
    MotionEl:
      (tag: string) =>
      ({ children, ...props }: Record<string, unknown>) => {
        const safe = Object.fromEntries(Object.entries(props).filter(([k]) => !FM_PROPS.has(k)));
        return createElement(tag, safe, children as ReactNode);
      },
  };
});

vi.mock('framer-motion', () => ({
  motion: { div: MotionEl('div'), button: MotionEl('button') },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../../lib/utils', () => ({
  formatPhone: vi.fn((v: string | null | undefined) =>
    v ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}` : ''
  ),
  formatPricePublic: vi.fn((price: number) => `R$ ${price.toFixed(2)}`),
  formatDisplayName: vi.fn((name: string) => name),
  getLocalDateString: vi.fn(() => '2026-07-22'),
}));

vi.mock('../../../lib/whatsapp', () => ({
  cleanPhoneForWhatsApp: vi.fn((phone: string) => `55${phone.replace(/\D/g, '')}`),
}));

vi.mock('./PlanSelectorModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="plan-selector-modal">PlanSelectorModal</div> : null,
}));

import ClientPanel from './ClientPanel';
import type { ClientWithStats, BookingWithClient, MensalistaPlan } from '../../../types';

const mockClient: ClientWithStats = {
  id: 'client-1',
  name: 'João Silva',
  phone: '31999999999',
  is_mensalista: false,
  created_at: '2025-01-15T12:00:00Z',
  notes: '',
  lastVisit: '2026-07-20',
  lastVisitDate: new Date('2026-07-20'),
  totalSpent: 250,
  bookingsCount: 5,
  isInactive: false,
};

const mockBookings: BookingWithClient[] = [
  {
    id: 'b1',
    client_id: 'client-1',
    service_ids: ['s1'],
    booking_date: '2026-07-20',
    booking_time: '10:00:00',
    status: 'completed',
    total_price: 45,
    total_duration: 30,
    created_at: '2026-07-20T08:00:00Z',
    clients: { name: 'João Silva', phone: '31999999999' },
  },
  {
    id: 'b2',
    client_id: 'client-1',
    service_ids: ['s1'],
    booking_date: '2026-07-10',
    booking_time: '14:00:00',
    status: 'completed',
    total_price: 45,
    total_duration: 30,
    created_at: '2026-07-10T08:00:00Z',
    clients: { name: 'João Silva', phone: '31999999999' },
  },
];

const defaultProps = {
  client: mockClient,
  panelBookings: mockBookings,
  panelTotal: 90,
  panelLast: new Date('2026-07-20'),
  notesText: '',
  isEditingNotes: false,
  savingNotes: false,
  plans: [] as MensalistaPlan[],
  onNotesChange: vi.fn(),
  onToggleEditNotes: vi.fn(),
  onSaveNotes: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onReminder: vi.fn(),
  onClose: vi.fn(),
  onToggleMensalista: vi.fn().mockResolvedValue(true),
};

function renderClientPanel(overrides = {}) {
  return render(<ClientPanel {...defaultProps} {...overrides} />);
}

describe('ClientPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders client name and phone', () => {
    renderClientPanel();
    expect(screen.getByText('João Silva')).toBeTruthy();
    expect(screen.getByText('(31) 99999-9999')).toBeTruthy();
  });

  it('shows mensalista badge when client.is_mensalista is true', () => {
    renderClientPanel({
      client: { ...mockClient, is_mensalista: true },
      planName: 'Plano Premium',
    });
    expect(screen.getByText('Plano Premium')).toBeTruthy();
  });

  it('shows stats: visits, total spent, and last visit', () => {
    renderClientPanel();
    expect(screen.getByText('2 visitas')).toBeTruthy();
    expect(screen.getByText('R$ 90.00')).toBeTruthy();
    expect(screen.getByText(/\/07\/2026/)).toBeTruthy();
  });

  it('WhatsApp link has correct URL', () => {
    renderClientPanel();
    const link = screen.getByText('WhatsApp').closest('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('https://wa.me/5531999999999');
  });

  it('Edit button calls onEdit', () => {
    const onEdit = vi.fn();
    renderClientPanel({ onEdit });
    const editBtn = screen.getByLabelText('Editar cliente');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('Delete button calls onDelete', () => {
    const onDelete = vi.fn();
    renderClientPanel({ onDelete });
    const deleteBtn = screen.getByLabelText('Excluir cliente');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Close button calls onClose', () => {
    const onClose = vi.fn();
    renderClientPanel({ onClose });
    const closeBtn = screen.getByLabelText('Fechar painel');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Notes section shows existing notes', () => {
    renderClientPanel({ notesText: 'Prefere degradê baixo' });
    expect(screen.getByText('Prefere degradê baixo')).toBeTruthy();
  });

  it('Notes section shows no-notes message when empty', () => {
    renderClientPanel({ notesText: '' });
    expect(screen.getByText('Nenhuma anotação registrada.')).toBeTruthy();
  });

  it('Toggle edit notes calls onToggleEditNotes', () => {
    const onToggleEditNotes = vi.fn();
    renderClientPanel({ onToggleEditNotes, notesText: '' });
    const addBtn = screen.getByText('+ Adicionar');
    fireEvent.click(addBtn);
    expect(onToggleEditNotes).toHaveBeenCalledTimes(1);
  });

  it('Save notes button calls onSaveNotes', () => {
    const onSaveNotes = vi.fn();
    renderClientPanel({ isEditingNotes: true, onSaveNotes });
    const saveBtn = screen.getByText('Salvar');
    fireEvent.click(saveBtn);
    expect(onSaveNotes).toHaveBeenCalledTimes(1);
  });

  it('Mensalista toggle: calls onToggleMensalista when removing', async () => {
    const onToggleMensalista = vi.fn().mockResolvedValue(true);
    renderClientPanel({
      client: { ...mockClient, is_mensalista: true },
      onToggleMensalista,
    });
    const toggleBtn = screen.getByText('Remover Mensalista');
    fireEvent.click(toggleBtn);
    expect(onToggleMensalista).toHaveBeenCalledWith();
  });

  it('Mensalista toggle: shows PlanSelectorModal when adding', () => {
    renderClientPanel({ client: { ...mockClient, is_mensalista: false } });
    const toggleBtn = screen.getByText('Tornar Mensalista');
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('plan-selector-modal')).toBeTruthy();
  });
});
