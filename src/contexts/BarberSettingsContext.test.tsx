import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { BarberSettingsProvider, useBarberSettings } from './BarberSettingsContext';

const mockSettingsData: Array<{ key: string; value: string }> = [
  { key: 'barber_name', value: 'Tato Barbeiro' },
  { key: 'barber_phone', value: '5531999999999' },
  { key: 'barber_photo', value: 'https://example.com/photo.jpg' },
  { key: 'barber_bio', value: 'Barbeiro há 10 anos' },
  { key: 'barber_quote', value: '"O melhor corte da cidade"' },
  { key: 'barber_instagram', value: '@tatobarber' },
  {
    key: 'barber_hours',
    value: JSON.stringify({
      '1': { enabled: true, open: '08:00', close: '18:00' },
      '2': { enabled: true, open: '08:00', close: '18:00' },
      '6': { enabled: true, open: '08:00', close: '17:00' },
    }),
  },
];

const mockDispatchEvent = vi.fn();
let mockDataSnapshot = [...mockSettingsData];

// Single builder instance returned every time `from` is called
const mockBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: mockDataSnapshot, error: null })),
};

const mockFrom = vi.fn().mockReturnValue(mockBuilder);

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BarberSettingsProvider>{children}</BarberSettingsProvider>;
}

describe('BarberSettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDataSnapshot = [...mockSettingsData];
    window.dispatchEvent = mockDispatchEvent;
  });

  it('carrega configurações no mount', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.barberName).toBe('Tato Barbeiro');
    expect(result.current.barberPhone).toBe('5531999999999');
    expect(result.current.barberPhoto).toBe('https://example.com/photo.jpg');
    expect(result.current.barberBio).toBe('Barbeiro há 10 anos');
    expect(result.current.barberQuote).toBe('"O melhor corte da cidade"');
    expect(result.current.barberInstagram).toBe('@tatobarber');
  });

  it('retorna valores default quando não está dentro de um provider', () => {
    const { result } = renderHook(() => useBarberSettings());

    expect(result.current.barberName).toBe('Admin');
    expect(result.current.barberPhone).toBe('');
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.updateBarberName).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('updateBarberName atualiza nome', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Reset mock to ensure clean state
    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberName('Novo Nome');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_name', value: 'Novo Nome' },
      { onConflict: 'key' }
    );
    expect(result.current.barberName).toBe('Novo Nome');
  });

  it('updateBarberName retorna false para nome vazio', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateBarberName('   ');
    });

    expect(success).toBe(false);
  });

  it('updateBarberPhone salva apenas dígitos', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberPhone('(31) 99999-9999');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_phone', value: '31999999999' },
      { onConflict: 'key' }
    );
  });

  it('updateBarberPhone retorna false para telefone curto', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateBarberPhone('123');
    });

    expect(success).toBe(false);
  });

  it('updateBarberInstagram remove @ do início', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberInstagram('@novo_instagram');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_instagram', value: 'novo_instagram' },
      { onConflict: 'key' }
    );
  });

  it('updateBarberPhoto atualiza foto', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberPhoto('https://new-photo.com/photo.jpg');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_photo', value: 'https://new-photo.com/photo.jpg' },
      { onConflict: 'key' }
    );
  });

  it('updateBarberHours salva JSON e atualiza estado', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    const hoursJSON = JSON.stringify({
      '1': { enabled: true, open: '09:00', close: '19:00' },
      '6': { enabled: true, open: '08:00', close: '17:00' },
      lunch_break: { enabled: true, start: '12:00', end: '13:00', days: [1, 2, 3, 4, 5] },
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberHours(hoursJSON);
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_hours', value: hoursJSON },
      { onConflict: 'key' }
    );
  });

  it('updateBarberBio atualiza biografia', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberBio('Nova biografia');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_bio', value: 'Nova biografia' },
      { onConflict: 'key' }
    );
  });

  it('updateBarberQuote atualiza frase', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    let success = false;
    await act(async () => {
      success = await result.current.updateBarberQuote('"Nova frase"');
    });

    expect(success).toBe(true);
    expect(mockBuilder.upsert).toHaveBeenCalledWith(
      { key: 'barber_quote', value: '"Nova frase"' },
      { onConflict: 'key' }
    );
  });

  it('dispara evento customizado ao atualizar telefone', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockBuilder.upsert.mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.updateBarberPhone('31988887777');
    });

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'barber-settings-changed' })
    );
  });

  it('refetch recarrega dados do banco', async () => {
    const { result } = renderHook(() => useBarberSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Modify the data snapshot so refetch picks up new data
    mockDataSnapshot = [
      ...mockSettingsData
        .slice(0, 1)
        .map((d) => (d.key === 'barber_name' ? { ...d, value: 'Nome Atualizado' } : d)),
      ...mockSettingsData.slice(1),
    ];

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.barberName).toBe('Nome Atualizado');
  });
});
