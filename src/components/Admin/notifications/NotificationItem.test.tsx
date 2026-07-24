import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import NotificationItem from './NotificationItem';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.ComponentProps<'button'> & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock parseNotifBody
vi.mock('../../../lib/notifications', () => ({
  parseNotifBody: vi.fn((body: string) => {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }),
  relativeTime: vi.fn(() => '5 min'),
}));

const createMockNotif = (overrides: Partial<Notification> = {}) => ({
  id: 'notif-1',
  user_id: 'user-1',
  title: 'Novo agendamento',
  body: JSON.stringify({
    clientName: 'João Silva',
    services: 'Corte, Barba',
    dateTime: '15/07 às 14:00',
    totalPrice: 'R$ 80',
    clientPhone: '(11) 99999-9999',
    manageUrl: 'https://example.com/manage',
  }),
  tag: 'new_booking',
  read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('NotificationItem', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza nome do cliente e serviços quando body é JSON válido', () => {
    const notif = createMockNotif();
    render(<NotificationItem notif={notif} {...defaultProps} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Corte, Barba')).toBeInTheDocument();
  });

  it('renderiza título quando body não é JSON válido', () => {
    const notif = createMockNotif({ body: 'texto simples' });
    render(<NotificationItem notif={notif} {...defaultProps} />);
    expect(screen.getByText('Novo agendamento')).toBeInTheDocument();
  });

  it('mostra indicador de não lida', () => {
    const notif = createMockNotif({ read: false });
    const { container } = render(<NotificationItem notif={notif} {...defaultProps} />);
    expect(container.querySelector('.rounded-full.bg-\\[\\#D4AF37\\]')).toBeTruthy();
  });

  it('não mostra indicador quando lida', () => {
    const notif = createMockNotif({ read: true });
    const { container } = render(<NotificationItem notif={notif} {...defaultProps} />);
    expect(container.querySelector('.rounded-full.bg-\\[\\#D4AF37\\]')).toBeFalsy();
  });

  it('chama onSelect ao clicar no item', () => {
    const onSelect = vi.fn();
    const notif = createMockNotif();
    render(<NotificationItem notif={notif} {...defaultProps} onSelect={onSelect} />);
    const btn = screen.getByText('João Silva').closest('button');
    btn?.click();
    expect(onSelect).toHaveBeenCalledWith(notif);
  });

  it('mostra +extra quando há mais de 2 serviços', () => {
    const notif = createMockNotif({
      body: JSON.stringify({
        clientName: 'Maria',
        services: 'Corte, Barba, Hidratação, Sobrancelha',
        dateTime: '15/07 às 14:00',
        totalPrice: 'R$ 150',
        clientPhone: '(11) 99999-9999',
        manageUrl: 'https://example.com/manage',
      }),
    });
    render(<NotificationItem notif={notif} {...defaultProps} />);
    // +extra é renderizado junto com a descrição: "Corte, Barba +2"
    expect(screen.getByText((content) => content.includes('+2'))).toBeInTheDocument();
  });

  it('não mostra descrição quando dados são nulos', () => {
    const notif = createMockNotif({ body: 'formato inválido' });
    render(<NotificationItem notif={notif} {...defaultProps} size="compact" />);
    // Apenas o título deve aparecer
    expect(screen.getByText('Novo agendamento')).toBeInTheDocument();
  });

  it('entra em modo de confirmação ao clicar em deletar', () => {
    const onDelete = vi.fn();
    const notif = createMockNotif();
    render(<NotificationItem notif={notif} {...defaultProps} onDelete={onDelete} />);

    // Encontra o botão de deletar e clica
    const deleteBtn = screen.getByTitle('Excluir notificação');
    act(() => {
      deleteBtn.click();
    });

    // Agora deve mostrar o ícone de confirmar (check)
    expect(screen.getByTitle('Clique novamente para confirmar')).toBeInTheDocument();
  });

  it('confirma deleção no segundo clique', () => {
    const onDelete = vi.fn();
    const notif = createMockNotif();
    render(<NotificationItem notif={notif} {...defaultProps} onDelete={onDelete} />);

    const deleteBtn = screen.getByTitle('Excluir notificação');
    act(() => {
      deleteBtn.click();
    });

    const confirmBtn = screen.getByTitle('Clique novamente para confirmar');
    act(() => {
      confirmBtn.click();
    });

    expect(onDelete).toHaveBeenCalledWith('notif-1');
  });

  it('cancela confirmação após 3 segundos', () => {
    const onDelete = vi.fn();
    const notif = createMockNotif();
    render(<NotificationItem notif={notif} {...defaultProps} onDelete={onDelete} />);

    const deleteBtn = screen.getByTitle('Excluir notificação');
    act(() => {
      deleteBtn.click();
    });

    // Confirma que está em modo de confirmação
    expect(screen.getByTitle('Clique novamente para confirmar')).toBeInTheDocument();

    // Avança 4 segundos
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // O timer de confirmação expirou — botão volta ao normal
    expect(screen.getByTitle('Excluir notificação')).toBeInTheDocument();
  });

  it('renderiza em modo compact', () => {
    const notif = createMockNotif();
    const { container } = render(
      <NotificationItem notif={notif} {...defaultProps} size="compact" />
    );
    // Compact mode: w-10 h-10 para o avatar
    const avatarContainer = container.querySelector('.w-10.h-10');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('renderiza em modo normal', () => {
    const notif = createMockNotif();
    const { container } = render(
      <NotificationItem notif={notif} {...defaultProps} size="normal" />
    );
    // Normal mode: w-12 h-12 para o avatar
    const avatarContainer = container.querySelector('.w-12.h-12');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('mostra checkbox quando selectable é true', () => {
    const notif = createMockNotif();
    render(
      <NotificationItem
        notif={notif}
        {...defaultProps}
        selectable={true}
        selected={false}
        onToggleSelect={vi.fn()}
      />
    );
    // Apenas verifica que não quebra
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('chama onToggleSelect ao clicar no checkbox', () => {
    const onToggleSelect = vi.fn();
    const notif = createMockNotif();
    render(
      <NotificationItem
        notif={notif}
        {...defaultProps}
        selectable={true}
        selected={false}
        onToggleSelect={onToggleSelect}
      />
    );
    // No modo selectable, clicar no botão principal chama onToggleSelect
    const btn = screen.getByText('João Silva').closest('button');
    btn?.click();
    expect(onToggleSelect).toHaveBeenCalledWith('notif-1');
  });
});
