import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FilterTabs from './FilterTabs';

describe('FilterTabs', () => {
  const defaultProps = {
    filter: 'occupied' as const,
    setFilter: vi.fn(),
    layoutId: 'testFilter',
    occupiedCount: 5,
    freeCount: 3,
    blockedCount: 2,
  };

  it('renderiza as 3 abas', () => {
    render(<FilterTabs {...defaultProps} />);
    expect(screen.getByText('Ocupados')).toBeInTheDocument();
    expect(screen.getByText('Livres')).toBeInTheDocument();
    expect(screen.getByText('Bloqueados')).toBeInTheDocument();
  });

  it('renderiza as contagens', () => {
    render(<FilterTabs {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('chama setFilter ao clicar em uma aba', () => {
    const setFilter = vi.fn();
    render(<FilterTabs {...defaultProps} setFilter={setFilter} />);

    screen.getByText('Livres').click();
    expect(setFilter).toHaveBeenCalledWith('free');
  });

  it('tem role="tablist" no container', () => {
    render(<FilterTabs {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('tem role="tab" em cada aba', () => {
    render(<FilterTabs {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('aba ativa tem aria-selected=true', () => {
    render(<FilterTabs {...defaultProps} filter="free" />);
    const freeTab = screen.getByText('Livres').closest('[role="tab"]');
    expect(freeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('aba inativa tem aria-selected=false', () => {
    render(<FilterTabs {...defaultProps} filter="free" />);
    const occupiedTab = screen.getByText('Ocupados').closest('[role="tab"]');
    expect(occupiedTab).toHaveAttribute('aria-selected', 'false');
  });
});
