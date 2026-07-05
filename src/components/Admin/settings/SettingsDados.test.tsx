import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsDados from './SettingsDados';

vi.mock('../../../lib/api', () => ({
  deleteAllBookings: vi.fn(() => Promise.resolve()),
  deleteAllClients: vi.fn(() => Promise.resolve()),
}));

describe('SettingsDados', () => {
  it('renderiza os botões de reset e delete', () => {
    render(<SettingsDados />);
    expect(screen.getByText('Resetar financeiro')).toBeInTheDocument();
    expect(screen.getByText('Deletar clientes')).toBeInTheDocument();
  });

  it('renderiza descriptions', () => {
    render(<SettingsDados />);
    expect(screen.getByText(/Zera faturamento/)).toBeInTheDocument();
    expect(screen.getByText(/Remove todos os clientes/)).toBeInTheDocument();
  });

  it('abre modal ao clicar em Resetar financeiro', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    expect(screen.getByPlaceholderText('Digite ZERAR para confirmar')).toBeInTheDocument();
  });

  it('abre modal ao clicar em Deletar clientes', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Deletar clientes'));
    expect(screen.getByPlaceholderText('Digite DELETAR para confirmar')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Digite ZERAR para confirmar')).not.toBeInTheDocument();
    });
  });

  it('botão confirmar fica desabilitado sem texto correto', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn).toBeDisabled();
  });

  it('botão confirmar habilita com texto ZERAR', () => {
    render(<SettingsDados />);
    fireEvent.click(screen.getByText('Resetar financeiro'));
    const input = screen.getByPlaceholderText('Digite ZERAR para confirmar');
    fireEvent.change(input, { target: { value: 'ZERAR' } });
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn).not.toBeDisabled();
  });
});
