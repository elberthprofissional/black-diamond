import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationDetail from './NotificationDetail';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
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
}));

// Mock formatPhone
vi.mock('../../../lib/utils', () => ({
  formatPhone: vi.fn((phone: string) => phone || ''),
}));

// Mock WhatsAppIcon
vi.mock('../../WhatsAppIcon', () => ({
  WhatsAppIcon: ({ className }: { className: string }) => (
    <span data-testid="whatsapp-icon" className={className}>
      WA
    </span>
  ),
}));

const createMockNotif = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  user_id: 'user-1',
  title: 'Novo agendamento',
  body: JSON.stringify({
    clientName: 'João Silva',
    services: 'Corte, Barba',
    dateTime: '15/07/2026 às 14:00',
    totalPrice: 'R$ 80,00',
    clientPhone: '(11) 99999-9999',
    manageUrl: 'https://example.com/manage',
  }),
  tag: 'new_booking',
  read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('NotificationDetail', () => {
  const defaultProps = {
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.open
    window.open = vi.fn();
  });

  it('renderiza null quando body não é parseável', () => {
    const notif = createMockNotif({ body: 'texto inválido' });
    const { container } = render(
      <NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza header com botão voltar e título', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Agendamento')).toBeInTheDocument();
  });

  it('mostra "Cancelado" no header quando notificação é de cancelamento', () => {
    const notif = createMockNotif({ tag: 'cancelled-booking' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('mostra alerta de no-show quando tag começa com no_show_alert_', () => {
    const notif = createMockNotif({ tag: 'no_show_alert_3' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Cliente com faltas acumuladas')).toBeInTheDocument();
    expect(screen.getByText('Conversar no WhatsApp')).toBeInTheDocument();
  });

  it('mostra alerta de cancelamento para tag cancelled', () => {
    const notif = createMockNotif({ tag: 'cancelled-abc' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Agendamento Cancelado')).toBeInTheDocument();
  });

  it('mostra alerta de cancelamento quando manageUrl é "Cancelado"', () => {
    const notif = createMockNotif({
      body: JSON.stringify({
        clientName: 'Maria',
        services: 'Corte',
        dateTime: '15/07/2026 às 10:00',
        totalPrice: 'R$ 50',
        clientPhone: '(11) 98888-8888',
        manageUrl: 'Cancelado',
      }),
    });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Agendamento Cancelado')).toBeInTheDocument();
  });

  it('renderiza informações do cliente', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renderiza data e hora', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('15/07/2026')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('renderiza lista de serviços e total', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('R$ 80,00')).toBeInTheDocument();
  });

  it('renderiza botão de enviar lembrete para notificação normal', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Enviar Lembrete')).toBeInTheDocument();
  });

  it('renderiza botão "Falar com Cliente" para notificação cancelada', () => {
    const notif = createMockNotif({ tag: 'cancelled-abc' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.getByText('Falar com Cliente')).toBeInTheDocument();
  });

  it('não renderiza botões de reagendar/cancelar para notificação cancelada', () => {
    const notif = createMockNotif({ tag: 'cancelled-abc' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    expect(screen.queryByText('Reagendar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });

  it('chama onBack ao clicar no botão voltar', () => {
    const onBack = vi.fn();
    const notif = createMockNotif();
    render(
      <NotificationDetail
        notif={notif as unknown as Notification}
        {...defaultProps}
        onBack={onBack}
      />
    );
    const backButtons = screen.getAllByRole('button');
    // O primeiro botão com ChevronLeft é o voltar
    backButtons[0]?.click();
    expect(onBack).toHaveBeenCalled();
  });

  it('abre WhatsApp ao clicar em Enviar Lembrete', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    const enviarBtn = screen.getByText('Enviar Lembrete');
    enviarBtn.click();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/5511999999999'),
      '_blank'
    );
  });

  it('abre WhatsApp para no-show', () => {
    const notif = createMockNotif({ tag: 'no_show_alert_2' });
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    const whatsBtn = screen.getByText('Conversar no WhatsApp');
    whatsBtn.click();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/5511999999999'),
      '_blank'
    );
  });

  it('chama onClose e navigate ao clicar em "Ver Perfil do Cliente" no no-show', () => {
    const onClose = vi.fn();
    const notif = createMockNotif({ tag: 'no_show_alert_1' });
    render(
      <NotificationDetail
        notif={notif as unknown as Notification}
        {...defaultProps}
        onClose={onClose}
      />
    );
    screen.getByText('Ver Perfil do Cliente').click();
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/clients');
  });

  it('navega para /cancelar ao clicar em Reagendar', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    screen.getByText('Reagendar').click();
    expect(mockNavigate).toHaveBeenCalledWith('/cancelar', {
      state: { phone: '(11) 99999-9999' },
    });
  });

  it('navega para /cancelar ao clicar em Cancelar', () => {
    const notif = createMockNotif();
    render(<NotificationDetail notif={notif as unknown as Notification} {...defaultProps} />);
    screen.getByText('Cancelar').click();
    expect(mockNavigate).toHaveBeenCalledWith('/cancelar', {
      state: { phone: '(11) 99999-9999' },
    });
  });
});
