import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomTabs from './BottomTabs';

// Mock BarberContext to return owner state (4 tabs view)
vi.mock('../../contexts/BarberContext', async () => {
  const actual = await vi.importActual('../../contexts/BarberContext');
  return {
    ...actual,
    useBarberContext: () => ({
      currentBarber: { id: '1', name: 'Tato' },
      isOwner: true,
      loading: false,
      barbers: [],
    }),
  };
});

const renderWithRouter = (initialRoute = '/admin') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <BottomTabs />
    </MemoryRouter>
  );
};

describe('BottomTabs', () => {
  it('renderiza os 4 botoes de navegacao para owner', () => {
    renderWithRouter();
    expect(screen.getByLabelText('Hoje')).toBeInTheDocument();
    expect(screen.getByLabelText('Semana')).toBeInTheDocument();
    expect(screen.getByLabelText('Clientes')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });

  it('renderiza labels visiveis', () => {
    renderWithRouter();
    expect(screen.getByLabelText('Hoje')).toBeInTheDocument();
    expect(screen.getByLabelText('Semana')).toBeInTheDocument();
    expect(screen.getByLabelText('Clientes')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });

  it('tem role="tablist" no container', () => {
    renderWithRouter();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('tem role="tab" em cada botao', () => {
    renderWithRouter();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('aba ativa tem aria-selected=true', () => {
    renderWithRouter('/admin');
    const todayTab = screen.getByLabelText('Hoje');
    expect(todayTab).toHaveAttribute('aria-selected', 'true');
  });

  it('aba inativa tem aria-selected=false', () => {
    renderWithRouter('/admin');
    const weekTab = screen.getByLabelText('Semana');
    expect(weekTab).toHaveAttribute('aria-selected', 'false');
  });

  it('tem aria-label de navegacao', () => {
    renderWithRouter();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });
});
