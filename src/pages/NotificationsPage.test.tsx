import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: 'n1',
        title: 'Novo agendamento',
        body: 'João marcou corte',
        tag: 'booking-1',
        read: false,
        created_at: '2026-07-09T10:00:00Z',
        user_id: 'u1',
      },
    ],
    unreadCount: 1,
    markAllAsRead: vi.fn(),
    clearNotification: vi.fn(),
  }),
}));

vi.mock('../components/Admin/notifications/NotificationDetail', () => ({
  default: () => <div>NotificationDetail</div>,
}));

vi.mock('../components/Admin/notifications/NotificationItem', () => ({
  default: () => <div>NotificationItem</div>,
}));

vi.mock('../components/Admin/notifications/NotificationFilters', () => ({
  default: () => <div>NotificationFilters</div>,
}));

import NotificationsPage from './NotificationsPage';

describe('NotificationsPage', () => {
  it('renderiza titulo de notificacoes', () => {
    render(<NotificationsPage />);
    expect(screen.getByText(/Notificações/i)).toBeInTheDocument();
  });
});
