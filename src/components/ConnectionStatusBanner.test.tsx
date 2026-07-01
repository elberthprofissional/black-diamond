import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseConnectionStatus = vi.fn();

vi.mock('../hooks/useConnectionStatus', () => ({
  useConnectionStatus: () => mockUseConnectionStatus(),
}));

import ConnectionStatusBanner from './ConnectionStatusBanner';

describe('ConnectionStatusBanner', () => {
  it('nao renderiza quando conectado', () => {
    mockUseConnectionStatus.mockReturnValue({ status: 'connected' });
    const { container } = render(<ConnectionStatusBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza mensagem quando desconectado', () => {
    mockUseConnectionStatus.mockReturnValue({ status: 'disconnected' });
    render(<ConnectionStatusBanner />);
    expect(screen.getByText(/Sem conexão/i)).toBeInTheDocument();
  });

  it('renderiza mensagem de verificando', () => {
    mockUseConnectionStatus.mockReturnValue({ status: 'checking' });
    render(<ConnectionStatusBanner />);
    expect(screen.getByText(/Verificando/i)).toBeInTheDocument();
  });

  it('tem role alert para acessibilidade', () => {
    mockUseConnectionStatus.mockReturnValue({ status: 'disconnected' });
    render(<ConnectionStatusBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
