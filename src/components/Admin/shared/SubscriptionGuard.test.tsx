import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../../contexts/BarberContext', () => ({
  useBarberContext: vi.fn(() => ({
    currentBarber: { id: 'barber-1', name: 'Tato', is_owner: true },
    isOwner: true,
  })),
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: vi.fn(() => ({
    status: { has_subscription: true, is_active: true, days_remaining: 20, status: 'active' },
    loading: false,
    payments: [],
  })),
}));

vi.mock('../../../lib/api/subscriptions', () => ({
  getOwnerPixKey: vi.fn().mockResolvedValue('70263397610'),
}));

vi.mock('../../Skeleton', () => ({
  SkeletonDashboard: () => <div data-testid="skeleton">Loading...</div>,
}));

import SubscriptionGuard from './SubscriptionGuard';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SubscriptionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza children para owners', () => {
    renderWithRouter(
      <SubscriptionGuard>
        <div data-testid="content">Protected Content</div>
      </SubscriptionGuard>
    );
    expect(screen.getByTestId('content')).toBeDefined();
    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('renderiza children quando assinatura está ativa', async () => {
    const { useBarberContext } = await import('../../../contexts/BarberContext');
    vi.mocked(useBarberContext).mockReturnValue({
      currentBarber: { id: 'barber-2', name: 'Barbeiro', is_owner: false },
      isOwner: false,
      barbers: [],
      loading: false,
      refreshBarbers: vi.fn(),
    });

    const { useSubscription } = await import('../../../hooks/useSubscription');
    vi.mocked(useSubscription).mockReturnValue({
      status: {
        has_subscription: true,
        is_active: true,
        days_remaining: 20,
        current_period_end: '2026-08-31',
        status: 'active',
      },
      loading: false,
      payments: [],
    });

    renderWithRouter(
      <SubscriptionGuard>
        <div data-testid="content">Protected Content</div>
      </SubscriptionGuard>
    );

    // Wait for pixKeyLoading to resolve
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeDefined();
    });
  });

  it('renderiza loading skeleton quando está carregando', async () => {
    const { useBarberContext } = await import('../../../contexts/BarberContext');
    vi.mocked(useBarberContext).mockReturnValue({
      currentBarber: { id: 'barber-2', name: 'Barbeiro', is_owner: false },
      isOwner: false,
      barbers: [],
      loading: false,
      refreshBarbers: vi.fn(),
    });

    const { useSubscription } = await import('../../../hooks/useSubscription');
    vi.mocked(useSubscription).mockReturnValue({
      status: null,
      loading: true,
      payments: [],
    });

    renderWithRouter(
      <SubscriptionGuard>
        <div>Protected Content</div>
      </SubscriptionGuard>
    );
    expect(screen.getByTestId('skeleton')).toBeDefined();
  });
});
