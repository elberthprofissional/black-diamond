import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsServicos from './SettingsServicos';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('SettingsServicos', () => {
  it('renderiza sem erros', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
  });

  it('mostra botão de adicionar', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Adicionar').length).toBeGreaterThan(0);
    });
  });

  it('mostra estado vazio quando não há serviços', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText(/Nenhum serviço cadastrado/).length).toBeGreaterThan(0);
    });
  });
});
