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

vi.mock('../components/Admin/NotificationBell', () => ({
  NotificationListContent: () => <div>NotificationListContent</div>,
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
}));

import NotificationsPage from './NotificationsPage';

describe('NotificationsPage', () => {
  it('renderiza titulo de notificacoes', () => {
    render(<NotificationsPage />);
    expect(screen.getByText(/Notificações/i)).toBeInTheDocument();
  });
});
