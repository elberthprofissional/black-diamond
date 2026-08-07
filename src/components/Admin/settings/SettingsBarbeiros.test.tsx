import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsBarbeiros from './SettingsBarbeiros';

vi.mock('../../../contexts/BarberContext', () => ({
  useBarberContext: () => ({
    barbers: [],
    bookableBarbers: [],
    currentBarber: null,
    isOwner: true,
    loading: false,
    refreshBarbers: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useBarberSettings', () => ({
  useBarberSettings: () => ({
    singleBarberMode: false,
    updateSingleBarberMode: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../../../lib/api/barbers', () => ({
  upsertBarber: vi.fn().mockResolvedValue('ok'),
  deleteBarber: vi.fn().mockResolvedValue(undefined),
}));

// Supabase global mock (test/setup.ts) cobre from/select/order/then.
// Aqui forçamos a lista de barbeiros vazia e um barbeiro existente.
const mockOrderThen = vi.fn((resolve: (v: unknown) => void) =>
  resolve({ data: mockBarbers, error: null, count: 0 })
);

let mockBarbers: unknown[] = [];

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: mockOrderThen,
    })),
  },
}));

describe('SettingsBarbeiros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBarbers = [];
  });

  it('abre o modal "Novo barbeiro" ao clicar no botão', () => {
    render(<SettingsBarbeiros />);

    const newButton = screen.getByRole('button', { name: '+ Novo barbeiro' });
    fireEvent.click(newButton);

    // Modal com role dialog + título
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Novo barbeiro')).toBeInTheDocument();
    expect(screen.getByText('Nome *')).toBeInTheDocument();
  });

  it('fecha o modal ao clicar no X', () => {
    render(<SettingsBarbeiros />);

    fireEvent.click(screen.getByRole('button', { name: '+ Novo barbeiro' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar formulário' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o modal de edição com o nome do barbeiro preenchido', async () => {
    mockBarbers = [
      {
        id: 'b1',
        name: 'Juninho',
        phone: '44999999999',
        photo_url: null,
        is_active: true,
        is_owner: false,
        sort_order: 0,
      },
    ];

    const { findByRole } = render(<SettingsBarbeiros />);

    // Aguarda a lista carregar e o botão de editar aparecer
    const editButton = await findByRole('button', { name: 'Editar Juninho' });
    fireEvent.click(editButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Editar barbeiro')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Juninho') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
  });

  it('mostra botão de reativar para barbeiro inativo', async () => {
    mockBarbers = [
      {
        id: 'b2',
        name: 'Carlos',
        phone: '44988887777',
        photo_url: null,
        is_active: false,
        is_owner: false,
        sort_order: 1,
      },
    ];

    const { findByRole } = render(<SettingsBarbeiros />);

    const reactivateButton = await findByRole('button', { name: 'Reativar Carlos' });
    expect(reactivateButton).toBeInTheDocument();

    // Barbeiro inativo não oferece o botão de desativar (lixeira)
    expect(screen.queryByRole('button', { name: 'Remover Carlos' })).not.toBeInTheDocument();
  });
});
