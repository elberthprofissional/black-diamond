import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationFilters from './NotificationFilters';

describe('NotificationFilters', () => {
  const defaultProps = {
    onlyUnread: false,
    unreadCount: 5,
    onChange: vi.fn(),
  };

  it('renderiza botão "Todas" e "Não lidas"', () => {
    render(<NotificationFilters {...defaultProps} />);
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Não lidas')).toBeInTheDocument();
  });

  it('mostra contagem de não lidas quando maior que 0', () => {
    render(<NotificationFilters {...defaultProps} unreadCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('não mostra badge quando contagem é 0', () => {
    render(<NotificationFilters {...defaultProps} unreadCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('chama onChange(false) ao clicar em "Todas"', () => {
    const onChange = vi.fn();
    render(<NotificationFilters {...defaultProps} onChange={onChange} />);
    screen.getByText('Todas').click();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('chama onChange(true) ao clicar em "Não lidas"', () => {
    const onChange = vi.fn();
    render(<NotificationFilters {...defaultProps} onChange={onChange} />);
    screen.getByText('Não lidas').click();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('destaca "Todas" quando onlyUnread é false', () => {
    render(<NotificationFilters {...defaultProps} onlyUnread={false} />);
    const todasBtn = screen.getByText('Todas');
    expect(todasBtn.className).toContain('bg-[#D4AF37]/15');
  });

  it('destaca "Não lidas" quando onlyUnread é true', () => {
    render(<NotificationFilters {...defaultProps} onlyUnread={true} />);
    const naoLidasBtn = screen.getByText('Não lidas');
    expect(naoLidasBtn.className).toContain('bg-[#D4AF37]/15');
  });
});
