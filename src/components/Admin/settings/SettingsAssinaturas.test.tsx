import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock do contexto de barbeiro — controla isOwner por teste.
const mockedUseBarberContext = vi.fn();
vi.mock('../../../contexts/BarberContext', () => ({
  useBarberContext: () => mockedUseBarberContext(),
}));

import SettingsAssinaturas from './SettingsAssinaturas';

describe('SettingsAssinaturas — gate de dono', () => {
  it('retorna null (tela vazia) para barbeiro comum (is_owner = false)', () => {
    mockedUseBarberContext.mockReturnValue({ isOwner: false, loading: false });
    const { container } = render(<SettingsAssinaturas />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza a gestão de assinaturas para o dono (is_owner = true)', async () => {
    mockedUseBarberContext.mockReturnValue({ isOwner: true, loading: false });
    render(<SettingsAssinaturas />);
    expect(await screen.findAllByText('Assinaturas')).toHaveLength(2); // header desktop + mobile
    expect(screen.getByText(/Sua Chave PIX/)).toBeInTheDocument();
  });
});
