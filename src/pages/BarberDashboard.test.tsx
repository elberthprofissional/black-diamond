import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock all dependencies
vi.mock('../contexts/BarberContext', () => ({
  useBarberContext: vi.fn(() => ({
    currentBarber: { id: 'barber-1', name: 'Tato', is_owner: true },
    isOwner: true,
    barbers: [],
    loading: false,
    refreshBarbers: vi.fn(),
  })),
}));

vi.mock('../hooks/useBookings', () => ({
  useBookings: vi.fn(() => ({
    bookings: [],
    loading: false,
    isCached: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useBookingModals', () => ({
  useBookingModals: vi.fn(() => ({
    selectedBooking: null,
    completingBooking: null,
    bookingToDelete: null,
    thankYouBooking: null,
    toast: null,
    setSelectedBooking: vi.fn(),
    setCompletingBooking: vi.fn(),
    setBookingToDelete: vi.fn(),
    confirmDelete: vi.fn(),
    handleComplete: vi.fn(),
    handleCancelThankYou: vi.fn(),
    handleSendThankYou: vi.fn(),
  })),
}));

vi.mock('../hooks/useServices', () => ({
  useServices: vi.fn(() => ({
    services: [{ id: 'svc-1', name: 'Corte de Cabelo', price: 35, duration: 40 }],
    loading: false,
  })),
}));

vi.mock('../hooks/useDayStatus', () => ({
  useDayStatus: vi.fn(() => ({
    isOpen: true,
    isClosed: false,
    dayStatus: 'open',
  })),
}));

vi.mock('../hooks/useBarberSettings', () => ({
  useBarberSettings: vi.fn(() => ({
    barberHours: JSON.stringify({
      '0': { enabled: false, open: '08:00', close: '18:00' },
      '1': { enabled: true, open: '08:00', close: '19:00' },
      '2': { enabled: true, open: '08:00', close: '18:00' },
      '3': { enabled: true, open: '08:00', close: '18:00' },
      '4': { enabled: true, open: '08:00', close: '18:00' },
      '5': { enabled: true, open: '08:00', close: '18:00' },
      '6': { enabled: true, open: '08:00', close: '18:00' },
    }),
  })),
}));

vi.mock('../hooks/useNoShow', () => ({
  useNoShow: vi.fn(() => ({
    markingNoShow: null,
    markAsNoShow: vi.fn(),
  })),
}));

vi.mock('../hooks/useSlotBlocking', () => ({
  useSlotBlocking: vi.fn(() => ({
    blockingSlot: null,
    unblockingBooking: null,
    setUnblockingBooking: vi.fn(),
    unblockSlot: vi.fn(),
    blockSlot: vi.fn(),
  })),
}));

vi.mock('../components/Admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('../components/Admin/shared/FilterTabs', () => ({
  default: ({
    filter: _filter,
    setFilter,
    occupiedCount,
    freeCount,
    blockedCount,
  }: {
    filter: string;
    setFilter: (f: string) => void;
    occupiedCount: number;
    freeCount: number;
    blockedCount: number;
  }) => (
    <div data-testid="filter-tabs">
      <button onClick={() => setFilter('occupied')}>Ocupados ({occupiedCount})</button>
      <button onClick={() => setFilter('free')}>Livres ({freeCount})</button>
      <button onClick={() => setFilter('blocked')}>Bloqueados ({blockedCount})</button>
    </div>
  ),
}));

vi.mock('../components/Admin/shared/BookingDetailPanel', () => ({
  default: () => <div data-testid="booking-detail-panel" />,
}));

vi.mock('../components/Admin/shared/DashboardHeader', () => ({
  default: () => <div data-testid="dashboard-header" />,
}));

vi.mock('../components/Admin/shared/FreePanel', () => ({
  default: () => <div data-testid="free-panel" />,
}));

vi.mock('../components/Admin/shared/BlockedPanel', () => ({
  default: () => <div data-testid="blocked-panel" />,
}));

vi.mock('../components/Admin/shared/OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner" />,
}));

vi.mock('../components/Admin/shared/UnblockModal', () => ({
  default: () => <div data-testid="unblock-modal" />,
}));

vi.mock('../components/Admin/shared/DeleteModal', () => ({
  default: () => <div data-testid="delete-modal" />,
}));

vi.mock('../components/Admin/shared/ToastNotification', () => ({
  default: () => <div data-testid="toast" />,
}));

vi.mock('../components/Skeleton', () => ({
  SkeletonDashboard: () => <div data-testid="skeleton">Loading...</div>,
}));

import BarberDashboard from './BarberDashboard';

describe('BarberDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza saudacao com nome do barbeiro', () => {
    render(
      <BrowserRouter>
        <BarberDashboard />
      </BrowserRouter>
    );
    expect(screen.getByText(/Tato/)).toBeDefined();
    expect(screen.getByText(/👋/)).toBeDefined();
  });

  it('renderiza metricas do dia', () => {
    render(
      <BrowserRouter>
        <BarberDashboard />
      </BrowserRouter>
    );
    expect(screen.getByText('Pendentes')).toBeDefined();
    expect(screen.getByText('Finalizados')).toBeDefined();
    expect(screen.getByText('Faturamento')).toBeDefined();
  });

  it('renderiza estado vazio quando nao ha agendamentos', () => {
    render(
      <BrowserRouter>
        <BarberDashboard />
      </BrowserRouter>
    );
    expect(screen.getByText('Nenhum agendamento pendente')).toBeDefined();
  });

  it('renderiza filtros', () => {
    render(
      <BrowserRouter>
        <BarberDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId('filter-tabs')).toBeDefined();
  });

  it('renderiza loading skeleton quando carregando', async () => {
    const { useBookings } = await import('../hooks/useBookings');
    vi.mocked(useBookings).mockReturnValue({
      bookings: [],
      loading: true,
      isCached: false,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <BarberDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId('skeleton')).toBeDefined();
  });
});
