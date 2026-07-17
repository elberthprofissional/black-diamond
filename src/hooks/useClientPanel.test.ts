import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientPanel } from './useClientPanel';
import type { ClientWithStats, MensalistaPlan } from '../types';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockLog = vi.fn();
const mockUpdateClient = vi.fn();
const mockUpdateClientNotes = vi.fn();
const mockDeleteClient = vi.fn();
const mockToggleClientMensalista = vi.fn();
const mockGetClientMilestones = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockGetLocalDateString = vi.fn().mockReturnValue('2026-07-15');
const mockGetErrorMessage = vi.fn().mockReturnValue('Erro');

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('./useAuditLog', () => ({
  useAuditLog: () => ({ log: mockLog }),
}));

vi.mock('../lib/api', () => ({
  updateClient: (...args: unknown[]) => mockUpdateClient(...args),
  updateClientNotes: (...args: unknown[]) => mockUpdateClientNotes(...args),
  deleteClient: (...args: unknown[]) => mockDeleteClient(...args),
  toggleClientMensalista: (...args: unknown[]) => mockToggleClientMensalista(...args),
}));

vi.mock('../lib/api/loyalty', () => ({
  getClientMilestones: (...args: unknown[]) => mockGetClientMilestones(...args),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('../lib/utils', () => ({
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
  maskName: vi.fn().mockReturnValue('J*** S***'),
  maskPhone: vi.fn().mockReturnValue('31*****9559'),
  getLocalDateString: (...args: unknown[]) => mockGetLocalDateString(...args),
}));

const mockSetClients = vi.fn();

const mockClient: ClientWithStats = {
  id: 'client-1',
  name: 'Joao Silva',
  phone: '31999998888',
  email: 'joao@test.com',
  notes: 'Cliente fiel',
  is_mensalista: false,
  is_favorite: false,
  created_at: '2025-01-01T00:00:00Z',
  lastVisit: '10/07/2026',
  totalSpent: 500,
  bookingsCount: 10,
  isInactive: false,
};

const mockPlans: MensalistaPlan[] = [
  {
    id: 'plan-1',
    name: 'Mensal Premium',
    price: 150,
    included_service_ids: ['s1'],
    allowed_days: [1, 2, 3, 4],
    is_active: true,
    is_default: true,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
];

describe('useClientPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock chain for supabase.from()
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetClientMilestones.mockResolvedValue([]);
    mockUpdateClient.mockResolvedValue(undefined);
    mockUpdateClientNotes.mockResolvedValue(undefined);
    mockDeleteClient.mockResolvedValue(undefined);
    mockToggleClientMensalista.mockResolvedValue(undefined);
  });

  it('initializes with no selected client', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    expect(result.current.selectedClient).toBeNull();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isDeleteOpen).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('opens panel and loads bookings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({
          data: [
            {
              id: 'b1',
              booking_date: '2026-07-15',
              booking_time: '14:00:00',
              status: 'confirmed',
              total_price: 50,
              clients: { name: 'Joao Silva', phone: '31999998888' },
            },
          ],
          error: null,
        })
      ),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });
    expect(result.current.selectedClient).toEqual(mockClient);
    expect(result.current.panelBookings).toHaveLength(1);
    expect(result.current.panelBookings[0].id).toBe('b1');
  });

  it('starts editing mode', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('Joao Updated');
      result.current.setEditPhone('31988887777');
      result.current.setIsEditing(true);
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editName).toBe('Joao Updated');
    expect(result.current.editPhone).toBe('31988887777');
  });

  it('saves client edit successfully', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('Joao Updated');
      result.current.setEditPhone('31988887777');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });

    expect(mockUpdateClient).toHaveBeenCalledWith('client-1', {
      name: 'Joao Updated',
      phone: '31988887777',
    });
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'client_updated' }));
  });

  it('does not save edit with empty name/phone', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('');
      result.current.setEditPhone('');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });

    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it('saves notes successfully', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setNotesText('Updated notes');
    });

    await act(async () => {
      await result.current.handleSaveNotes();
    });

    expect(mockUpdateClientNotes).toHaveBeenCalledWith('client-1', 'Updated notes');
  });

  it('deletes client successfully', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mockDeleteClient).toHaveBeenCalledWith('client-1');
    expect(mockShowSuccess).toHaveBeenCalledWith('Cliente excluído!');
    expect(mockSetClients).toHaveBeenCalled();
  });

  it('handles delete error', async () => {
    mockDeleteClient.mockRejectedValue(new Error('Erro ao deletar'));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(mockShowError).toHaveBeenCalled();
  });

  it('toggles mensalista status', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setExpiresAt('2026-08-15');
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.handleToggleMensalista('plan-1');
    });

    expect(success).toBe(true);
    expect(mockToggleClientMensalista).toHaveBeenCalledWith(
      'client-1',
      true,
      'plan-1',
      '2026-08-15'
    );
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('mensalista'));
  });

  it('removes mensalista status', async () => {
    const mensalistaClient = { ...mockClient, is_mensalista: true, mensalista_plan_id: 'plan-1' };
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mensalistaClient);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.handleToggleMensalista();
    });

    expect(success).toBe(true);
    expect(mockToggleClientMensalista).toHaveBeenCalledWith('client-1', false, undefined, null);
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('removida'));
  });

  it('closes the panel', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setIsEditing(true);
    });
    expect(result.current.selectedClient).not.toBeNull();

    act(() => {
      result.current.closePanel();
    });
    expect(result.current.selectedClient).toBeNull();
    expect(result.current.isEditing).toBe(false);
  });

  it('computes panel total and last visit', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({
          data: [
            { id: 'b1', booking_date: '2026-07-10', total_price: 100 },
            { id: 'b2', booking_date: '2026-07-15', total_price: 50 },
          ],
          error: null,
        })
      ),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.panelTotal).toBe(150);
  });

  it('resolves plan name for mensalista client', () => {
    const mensalistaClient = {
      ...mockClient,
      is_mensalista: true,
      mensalista_plan_id: 'plan-1',
    };
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mensalistaClient);
    });
    expect(result.current.planName).toBe('Mensal Premium');
  });
});
