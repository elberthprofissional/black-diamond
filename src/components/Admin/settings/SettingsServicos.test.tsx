import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsServicos from './SettingsServicos';

const mockSupabase = vi.hoisted(() => {
  const builder: Record<string, unknown> = {};
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
  };
  Object.assign(builder, chain);
  return {
    supabase: {
      from: vi.fn(() => builder),
    },
    builder,
  };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase.supabase,
}));

vi.mock('../../../lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('../../../lib/utils', () => ({
  formatPrice: (p: number) => `R$ ${p}`,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (
          typeof v === 'function' ||
          k === 'initial' ||
          k === 'animate' ||
          k === 'exit' ||
          k === 'transition'
        ) {
          continue;
        }
        safe[k] = v;
      }
      return <div {...safe}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SettingsServicos', () => {
  beforeEach(() => {
    // Don't clearAllMocks - it breaks mockReturnThis() chain on the shared builder.
    // Only reset mocks that tests override, preserving chain methods.
    mockSupabase.builder.order.mockReset();
    mockSupabase.builder.order.mockResolvedValue({ data: [], error: null });
  });

  it('renders loading state initially', () => {
    mockSupabase.builder.order.mockReturnValue(new Promise(() => {}));
    render(<SettingsServicos />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state after load', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Nenhum serviço cadastrado/).length).toBeGreaterThan(0);
  });

  it('renders services list when data exists', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Service 1', price: 50 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Service 1').length).toBeGreaterThan(0);
    });
  });

  it('shows service count', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [
        { id: '1', name: 'A', price: 50 },
        { id: '2', name: 'B', price: 60 },
        { id: '3', name: 'C', price: 70 },
      ],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('3 de 15')).toBeInTheDocument();
    });
  });

  it('disables add button when at max services', async () => {
    const services = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `S${i}`,
      price: 50,
    }));
    mockSupabase.builder.order.mockResolvedValue({ data: services, error: null });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Adicionar').length).toBeGreaterThan(0);
    });
    const addButtons = screen.getAllByText('Adicionar');
    addButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('opens add form', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    expect(screen.getByText('Novo Serviço')).toBeInTheDocument();
  });

  it('closes add form on cancel', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    expect(screen.getByText('Novo Serviço')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Cancelar'));
    expect(screen.queryByText('Novo Serviço')).not.toBeInTheDocument();
  });

  it('validates empty name on add', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Digite o nome do serviço')).toBeInTheDocument();
    });
  });

  it('validates empty price on add', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    await userEvent.type(nameInput, 'Test');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Digite um preço válido')).toBeInTheDocument();
    });
  });

  it('validates minimum price on add', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Test');
    await userEvent.type(priceInput, '3');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Preço mínimo é R$ 5,00')).toBeInTheDocument();
    });
  });

  it('validates name length exceeds max', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    // The input has maxLength={30}, so type 30 chars and verify count shows 30/30
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    await userEvent.type(nameInput, 'A'.repeat(30));
    expect(screen.getByText('30/30')).toBeInTheDocument();
    // Try typing more - should not exceed 30
    await userEvent.type(nameInput, 'B');
    expect(nameInput).toHaveValue('A'.repeat(30));
  });

  it('successfully adds a service', async () => {
    mockSupabase.builder.insert.mockResolvedValue({ error: null });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Corte');
    await userEvent.type(priceInput, '50');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(mockSupabase.builder.insert).toHaveBeenCalled();
    });
  });

  it('handles add error from supabase', async () => {
    mockSupabase.builder.insert.mockResolvedValue({ error: { message: 'db error' } });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Corte');
    await userEvent.type(priceInput, '50');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Erro ao adicionar serviço')).toBeInTheDocument();
    });
  });

  it('handles load error from supabase', async () => {
    mockSupabase.builder.order.mockResolvedValue({ data: null, error: { message: 'fail' } });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar serviços')).toBeInTheDocument();
    });
  });

  it('opens edit form with pre-filled data', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    expect(screen.getByText('Editar Serviço')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Corte')).toBeInTheDocument();
  });

  it('validates empty name on update', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    const nameInput = screen.getByDisplayValue('Corte');
    await userEvent.clear(nameInput);
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Nome: 1-30 caracteres')).toBeInTheDocument();
    });
  });

  it('validates minimum price on update', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    const priceInput = screen.getByDisplayValue('45');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '3');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Preço mínimo é R$ 5,00')).toBeInTheDocument();
    });
  });

  it('successfully updates a service', async () => {
    mockSupabase.builder.update.mockResolvedValue({ error: null });
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(mockSupabase.builder.update).toHaveBeenCalled();
    });
  });

  it('handles update error from supabase', async () => {
    mockSupabase.builder.update.mockResolvedValue({ error: { message: 'fail' } });
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Erro ao atualizar serviço')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation and cancels', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Excluir'));
    expect(screen.getByText('Excluir serviço?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Excluir serviço?')).not.toBeInTheDocument();
  });

  it('successfully deletes a service', async () => {
    mockSupabase.builder.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Excluir'));
    fireEvent.click(screen.getByText('Excluir'));
    await waitFor(() => {
      expect(screen.getByText('Serviço removido!')).toBeInTheDocument();
    });
  });

  it('handles delete error from supabase', async () => {
    mockSupabase.builder.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'fail' } })
    );
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Excluir'));
    fireEvent.click(screen.getByText('Excluir'));
    await waitFor(() => {
      expect(screen.getByText('Erro ao remover serviço')).toBeInTheDocument();
    });
  });

  it('shows deleting state in delete modal', async () => {
    // Make the chain hang (never resolve) by overriding then
    mockSupabase.builder.then.mockReturnValue(new Promise(() => {}));
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Excluir'));
    fireEvent.click(screen.getByText('Excluir'));
    await waitFor(() => {
      expect(screen.getByText('Excluindo...')).toBeInTheDocument();
    });
  });

  it('supports comma as decimal separator in price', async () => {
    mockSupabase.builder.insert.mockResolvedValue({ error: null });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Barba');
    await userEvent.type(priceInput, '30,50');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(mockSupabase.builder.insert).toHaveBeenCalled();
    });
  });

  it('handles name input exceeding max length', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    await userEvent.type(nameInput, 'A'.repeat(35));
    expect(nameInput).toHaveValue('A'.repeat(30));
  });

  it('submits via Enter key in name input', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    await userEvent.type(nameInput, 'Corte');
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('Digite um preço válido')).toBeInTheDocument();
    });
  });

  it('validates zero price on add', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Test');
    await userEvent.type(priceInput, '0');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Digite um preço válido')).toBeInTheDocument();
    });
  });

  it('validates invalid price NaN on add', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const nameInput = screen.getByPlaceholderText('Ex: Corte de Cabelo');
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(nameInput, 'Test');
    await userEvent.type(priceInput, 'abc');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Digite um preço válido')).toBeInTheDocument();
    });
  });

  it('validates price < 5 on update', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    const priceInput = screen.getByDisplayValue('45');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '4');
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Preço mínimo é R$ 5,00')).toBeInTheDocument();
    });
  });

  it('validates empty price on update', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    const priceInput = screen.getByDisplayValue('45');
    await userEvent.clear(priceInput);
    fireEvent.click(screen.getByLabelText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Preço inválido')).toBeInTheDocument();
    });
  });

  it('name input on edit enforces maxLength', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    const nameInput = screen.getByDisplayValue('Corte');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'A'.repeat(35));
    expect(nameInput).toHaveValue('A'.repeat(30));
  });

  it('price input rejects non-numeric characters', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(priceInput, 'abc!@#');
    expect(priceInput).toHaveValue('');
  });

  it('price input respects max length', async () => {
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getByText('Serviços cadastrados')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('Adicionar')[0]);
    const priceInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(priceInput, '12345678');
    expect(priceInput).toHaveValue('123456');
  });

  it('closes edit form on cancel', async () => {
    mockSupabase.builder.order.mockResolvedValue({
      data: [{ id: '1', name: 'Corte', price: 45 }],
      error: null,
    });
    render(<SettingsServicos />);
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByTitle('Editar'));
    expect(screen.getByText('Editar Serviço')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Cancelar'));
    expect(screen.queryByText('Editar Serviço')).not.toBeInTheDocument();
  });
});
