import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientPanel } from './useClientPanel';
import type { ClientWithStats, MensalistaPlan } from '../types';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
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

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
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

function createChain(data: unknown[] = []) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data, error: null })),
  };
}

describe('useClientPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue(createChain());
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
    mockSupabaseFrom.mockReturnValue(
      createChain([
        {
          id: 'b1',
          booking_date: '2026-07-15',
          booking_time: '14:00:00',
          status: 'confirmed',
          total_price: 50,
          clients: { name: 'Joao Silva', phone: '31999998888' },
        },
      ])
    );

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });
    expect(result.current.selectedClient).toEqual(mockClient);
    expect(result.current.panelBookings).toHaveLength(1);
    expect(result.current.panelBookings[0].id).toBe('b1');
  });

  it('opens panel and loads milestones', async () => {
    mockGetClientMilestones.mockResolvedValue([
      { milestone_id: 'm1', visits_required: 5, current_visits: 3, reward_service_name: 'Corte' },
    ]);

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });
    expect(result.current.milestoneProgress).toHaveLength(1);
  });

  it('handles openPanel error gracefully', async () => {
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error('network');
    });

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.panelBookings).toEqual([]);
    expect(result.current.milestoneProgress).toEqual([]);
  });

  it('handles getClientMilestones failure gracefully', async () => {
    mockGetClientMilestones.mockRejectedValue(new Error('timeout'));
    mockSupabaseFrom.mockReturnValue(createChain([{ id: 'b1', total_price: 50 }]));

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.panelBookings).toHaveLength(1);
    expect(result.current.milestoneProgress).toEqual([]);
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
    expect(result.current.isEditing).toBe(false);
  });

  it('does not save edit with empty name', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('');
      result.current.setEditPhone('31988887777');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });
    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it('does not save edit with empty phone', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('Joao');
      result.current.setEditPhone('');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });
    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it('does not save edit with no selected client', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setEditName('Joao');
      result.current.setEditPhone('31988887777');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });
    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it('handles save edit error', async () => {
    mockUpdateClient.mockRejectedValue(new Error('save failed'));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setEditName('Joao Updated');
      result.current.setEditPhone('31988887777');
    });

    await act(async () => {
      await result.current.handleSaveEdit();
    });

    expect(mockShowError).toHaveBeenCalled();
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

  it('does not save notes with no selected client', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.handleSaveNotes();
    });
    expect(mockUpdateClientNotes).not.toHaveBeenCalled();
  });

  it('handles save notes error', async () => {
    mockUpdateClientNotes.mockRejectedValue(new Error('notes failed'));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setNotesText('Notes');
    });

    await act(async () => {
      await result.current.handleSaveNotes();
    });

    expect(mockShowError).toHaveBeenCalled();
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
  });

  it('does not delete with no selected client', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(mockDeleteClient).not.toHaveBeenCalled();
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

  it('toggles mensalista ON', async () => {
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

  it('toggles mensalista OFF', async () => {
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
    expect(mockToggleClientMensalista).toHaveBeenCalledWith('client-1', false);
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('removida'));
  });

  it('handleToggleMensalista: no selected client → returns false', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.handleToggleMensalista('plan-1');
    });
    expect(success).toBe(false);
  });

  it('handleToggleMensalista: error → returns false', async () => {
    mockToggleClientMensalista.mockRejectedValue(new Error('toggle failed'));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.handleToggleMensalista('plan-1');
    });

    expect(success).toBe(false);
    expect(mockShowError).toHaveBeenCalled();
  });

  it('toggles mensalista with empty expiresAt', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setExpiresAt('');
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.handleToggleMensalista('plan-1');
    });

    expect(success).toBe(true);
    expect(mockToggleClientMensalista).toHaveBeenCalledWith('client-1', true, 'plan-1', null);
  });

  it('closes the panel', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
      result.current.setIsEditing(true);
      result.current.setIsEditingNotes(true);
      result.current.setIsDeleteOpen(true);
    });

    act(() => {
      result.current.closePanel();
    });

    expect(result.current.selectedClient).toBeNull();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isEditingNotes).toBe(false);
    expect(result.current.isDeleteOpen).toBe(false);
  });

  it('computes panelTotal from bookings', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain([
        { id: 'b1', booking_date: '2026-07-10', total_price: 100 },
        { id: 'b2', booking_date: '2026-07-15', total_price: 50 },
      ])
    );

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.panelTotal).toBe(150);
  });

  it('computes panelLast from first booking', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain([{ id: 'b1', booking_date: '2026-07-15', total_price: 50 }])
    );

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.panelLast).toBeInstanceOf(Date);
  });

  it('panelLast is null when no bookings', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });
    expect(result.current.panelLast).toBeNull();
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

  it('planName is undefined for non-mensalista', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
    });
    expect(result.current.planName).toBeUndefined();
  });

  it('planName is undefined for mensalista without plan id', () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient({ ...mockClient, is_mensalista: true });
    });
    expect(result.current.planName).toBeUndefined();
  });

  it('openPanelWithExpiry: client with existing expiry', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    const client = { ...mockClient, mensalista_expires_at: '2026-08-15' };

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanelWithExpiry(client);
    });

    expect(result.current.expiresAt).toBe('2026-08-15');
    expect(result.current.selectedClient).toEqual(client);
  });

  it('openPanelWithExpiry: client without expiry → sets 30 days from now', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    mockGetLocalDateString.mockReturnValue('2026-08-14');

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanelWithExpiry(mockClient);
    });

    expect(result.current.expiresAt).toBe('2026-08-14');
    expect(mockGetLocalDateString).toHaveBeenCalled();
  });

  it('handleRenewMensalidade: not mensalista → returns early', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mockClient);
    });

    await act(async () => {
      await result.current.handleRenewMensalidade(30);
    });

    expect(mockToggleClientMensalista).not.toHaveBeenCalled();
  });

  it('handleRenewMensalidade: no selected client → returns early', async () => {
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.handleRenewMensalidade(30);
    });
    expect(mockToggleClientMensalista).not.toHaveBeenCalled();
  });

  it('handleRenewMensalidade: success', async () => {
    mockGetLocalDateString.mockReturnValue('2026-08-14');
    const mensalistaClient = {
      ...mockClient,
      is_mensalista: true,
      mensalista_plan_id: 'plan-1',
    };

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mensalistaClient);
    });

    await act(async () => {
      await result.current.handleRenewMensalidade(30);
    });

    expect(mockToggleClientMensalista).toHaveBeenCalledWith(
      'client-1',
      true,
      'plan-1',
      '2026-08-14'
    );
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(result.current.expiresAt).toBe('2026-08-14');
  });

  it('handleRenewMensalidade: default 30 days', async () => {
    mockGetLocalDateString.mockReturnValue('2026-08-14');
    const mensalistaClient = {
      ...mockClient,
      is_mensalista: true,
      mensalista_plan_id: 'plan-1',
    };

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mensalistaClient);
    });

    await act(async () => {
      await result.current.handleRenewMensalidade();
    });

    expect(mockToggleClientMensalista).toHaveBeenCalled();
  });

  it('handleRenewMensalidade: error', async () => {
    mockToggleClientMensalista.mockRejectedValue(new Error('renew failed'));
    const mensalistaClient = {
      ...mockClient,
      is_mensalista: true,
      mensalista_plan_id: 'plan-1',
    };

    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    act(() => {
      result.current.setSelectedClient(mensalistaClient);
    });

    await act(async () => {
      await result.current.handleRenewMensalidade(30);
    });

    expect(mockShowError).toHaveBeenCalled();
  });

  it('openPanel resets editing states', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));

    act(() => {
      result.current.setIsEditing(true);
      result.current.setIsEditingNotes(true);
    });

    await act(async () => {
      await result.current.openPanel(mockClient);
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.isEditingNotes).toBe(false);
  });

  it('openPanel sets notesText from client', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(mockClient);
    });
    expect(result.current.notesText).toBe('Cliente fiel');
  });

  it('openPanel: notes default to empty string', async () => {
    mockSupabaseFrom.mockReturnValue(createChain([]));
    const clientNoNotes = { ...mockClient, notes: undefined };
    const { result } = renderHook(() => useClientPanel(mockSetClients, mockPlans));
    await act(async () => {
      await result.current.openPanel(clientNoNotes);
    });
    expect(result.current.notesText).toBe('');
  });
});
