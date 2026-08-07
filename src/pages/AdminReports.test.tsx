import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock hooks
vi.mock('../hooks/useProfileStats', () => ({
  useProfileStats: vi.fn(() => ({
    stats: {
      lucroSemana: 500,
      lucroMes: 2000,
      lucroTotal: 15000,
      concluidosSemana: 10,
      concluidosMes: 40,
      canceladosSemana: 2,
      canceladosMes: 5,
      topServices: [
        { name: 'Corte de Cabelo', count: 50 },
        { name: 'Barba', count: 30 },
        { name: 'Sobrancelha', count: 15 },
      ],
    },
    loading: false,
  })),
}));

vi.mock('../hooks/useWeeklyRevenue', () => ({
  useWeeklyRevenue: vi.fn(() => ({
    currentWeek: { revenue: 500, count: 10, daily: [0, 80, 0, 120, 150, 100, 50] },
    lastWeek: { revenue: 400, count: 8, daily: [0, 60, 0, 100, 120, 80, 40] },
    changePercent: 25,
    loading: false,
  })),
}));

// Mock AdminLayout since it's a complex component
vi.mock('../components/Admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

// BarberProvider (usado por useBarberScope) precisa de supabase + barbers mockados
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../lib/api/barbers', () => ({
  getBarbers: vi.fn().mockResolvedValue([]),
  getBarberByUserId: vi.fn().mockResolvedValue(null),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import { BarberProvider } from '../contexts/BarberContext';
import AdminReports from './AdminReports';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <BarberSettingsProvider>
          <BarberProvider>{children}</BarberProvider>
        </BarberSettingsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AdminReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza titulo da pagina', () => {
    render(
      <Wrapper>
        <AdminReports />
      </Wrapper>
    );
    expect(screen.getByText('Painel')).toBeDefined();
  });

  it('renderiza ganhos da semana e total', () => {
    render(
      <Wrapper>
        <AdminReports />
      </Wrapper>
    );
    // Check for revenue sections
    expect(screen.getByText(/Ganhos Semana/)).toBeDefined();
    expect(screen.getByText(/Total Geral/)).toBeDefined();
    // Check weekly revenue appears (use getAllByText since R$500 appears in multiple places)
    const revenueElements = screen.getAllByText(/500/);
    expect(revenueElements.length).toBeGreaterThan(0);
  });

  it('renderiza comparacao semanal', () => {
    render(
      <Wrapper>
        <AdminReports />
      </Wrapper>
    );
    expect(screen.getByText(/Comparação Semanal/)).toBeDefined();
    expect(screen.getByText('+25%')).toBeDefined();
  });

  it('renderiza servicos populares', () => {
    render(
      <Wrapper>
        <AdminReports />
      </Wrapper>
    );
    expect(screen.getByText('Serviços Populares')).toBeDefined();
    expect(screen.getByText('Corte de Cabelo')).toBeDefined();
    expect(screen.getByText('Barba')).toBeDefined();
  });

  it('alterna entre semana e mes', () => {
    render(
      <Wrapper>
        <AdminReports />
      </Wrapper>
    );
    expect(screen.getByText('Semana')).toBeDefined();
    expect(screen.getByText('Mês')).toBeDefined();
  });
});
