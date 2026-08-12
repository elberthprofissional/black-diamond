import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBarberHours, getTimeSlotsForDate } from './slots';

const mockSupabase = vi.hoisted(() => {
  const qb: Record<string, unknown> = {};
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  Object.assign(qb, builder);
  return {
    supabase: {
      from: vi.fn(() => qb),
    },
    builder,
  };
});

vi.mock('../supabase', () => ({
  supabase: mockSupabase.supabase,
}));

vi.mock('../logger', () => ({
  logError: vi.fn(),
}));

describe('getBarberHours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default hours when no data found', async () => {
    const hours = await getBarberHours();
    expect(hours).toBeDefined();
    expect(hours['1']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
    expect(hours['0']).toEqual({ enabled: false, open: '09:00', close: '14:00' });
  });

  it('parses barber_hours JSON from settings', async () => {
    const customHours = {
      '1': { enabled: true, open: '09:00', close: '19:00' },
      '2': { enabled: true, open: '09:00', close: '19:00' },
      '3': { enabled: true, open: '09:00', close: '19:00' },
      '4': { enabled: true, open: '09:00', close: '19:00' },
      '5': { enabled: true, open: '09:00', close: '19:00' },
      '6': { enabled: true, open: '09:00', close: '14:00' },
      '0': { enabled: false, open: '09:00', close: '14:00' },
    };
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(customHours) },
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours['1']?.open).toBe('09:00');
    expect(hours['1']?.close).toBe('19:00');
  });

  it('merges custom hours with defaults', async () => {
    const partialHours = {
      '1': { enabled: false, open: '10:00', close: '20:00' },
    };
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(partialHours) },
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours['1']?.enabled).toBe(false);
    expect(hours['2']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
  });

  it('falls back to individual settings when no barber_hours', async () => {
    mockSupabase.builder.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    mockSupabase.builder.in.mockResolvedValue({
      data: [
        { key: 'working_days', value: '1,2,3,4,5' },
        { key: 'opening_time', value: '09:00' },
        { key: 'closing_time', value: '17:00' },
        { key: 'saturday_opening', value: '08:00' },
        { key: 'saturday_closing', value: '12:00' },
      ],
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours).toBeDefined();
  });

  it('handles empty individual settings rows', async () => {
    mockSupabase.builder.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.builder.in.mockResolvedValue({ data: [], error: null });

    const hours = await getBarberHours();
    expect(hours['1']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
  });

  it('returns defaults on error', async () => {
    mockSupabase.builder.maybeSingle.mockRejectedValue(new Error('DB error'));

    const hours = await getBarberHours();
    expect(hours['1']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
  });

  it('handles invalid JSON in barber_hours', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: 'not-json' },
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours['1']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
  });

  it('handles barber_hours with lunch_break only (no day keys)', async () => {
    const data = {
      lunch_break: { enabled: true, start: '12:00', end: '13:00', days: [1, 2] },
    };
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(data) },
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours['1']).toEqual({ enabled: true, open: '08:00', close: '18:00' });
  });

  it('builds individual settings for each day', async () => {
    mockSupabase.builder.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.builder.in.mockResolvedValue({
      data: [
        { key: 'working_days', value: '1,3,5' },
        { key: 'opening_time', value: '09:00' },
        { key: 'closing_time', value: '17:00' },
        { key: 'saturday_opening', value: '08:00' },
        { key: 'saturday_closing', value: '13:00' },
      ],
      error: null,
    });

    const hours = await getBarberHours();
    expect(hours['1']?.enabled).toBe(true);
    expect(hours['1']?.open).toBe('09:00');
    expect(hours['2']?.enabled).toBe(false);
    expect(hours['6']?.open).toBe('08:00');
    expect(hours['6']?.close).toBe('13:00');
    expect(hours['0']?.enabled).toBe(false);
  });
});

describe('getTimeSlotsForDate', () => {
  // Use unique date strings per test to avoid cache conflicts
  const FULL_WEEK = {
    '1': { enabled: true, open: '08:00', close: '18:00' },
    '2': { enabled: true, open: '08:00', close: '18:00' },
    '3': { enabled: true, open: '08:00', close: '18:00' },
    '4': { enabled: true, open: '08:00', close: '18:00' },
    '5': { enabled: true, open: '08:00', close: '18:00' },
    '6': { enabled: true, open: '08:00', close: '14:00' },
    '0': { enabled: false, open: '09:00', close: '14:00' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns slots for a normal weekday', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // 2026-07-20 is Monday
    const slots = await getTimeSlotsForDate('2026-07-20');
    expect(slots).toContain('08:00');
    expect(slots).toContain('09:00');
    expect(slots).toContain('17:00');
    expect(slots).not.toContain('18:00');
  });

  it('returns empty for disabled day', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // 2026-07-19 is Sunday (day 0, disabled)
    const slots = await getTimeSlotsForDate('2026-07-19');
    expect(slots).toEqual([]);
  });

  it('filters lunch break slots', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: {
        value: JSON.stringify({
          ...FULL_WEEK,
          lunch_break: {
            enabled: true,
            start: '12:00',
            end: '13:00',
            days: [1],
          },
        }),
      },
      error: null,
    });

    // 2026-07-27 is Monday (different from test above to avoid cache)
    const slots = await getTimeSlotsForDate('2026-07-27');
    expect(slots).not.toContain('12:00');
    expect(slots).toContain('11:00');
    expect(slots).toContain('13:00');
  });

  it('returns cached result on second call', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // 2026-08-03 is Monday
    const slots1 = await getTimeSlotsForDate('2026-08-03');
    const slots2 = await getTimeSlotsForDate('2026-08-03');
    expect(slots1).toEqual(slots2);
    expect(mockSupabase.supabase.from).toHaveBeenCalledTimes(1);
  });

  it('falls back to getBarberHours on error', async () => {
    mockSupabase.builder.maybeSingle.mockRejectedValue(new Error('DB error'));

    mockSupabase.builder.in.mockResolvedValue({
      data: [
        { key: 'working_days', value: '1,2,3,4,5,6' },
        { key: 'opening_time', value: '08:00' },
        { key: 'closing_time', value: '18:00' },
      ],
      error: null,
    });

    // 2026-08-10 is Monday
    const slots = await getTimeSlotsForDate('2026-08-10');
    expect(slots).toBeDefined();
    expect(Array.isArray(slots)).toBe(true);
  });

  it('returns empty when fallback day is disabled', async () => {
    mockSupabase.builder.maybeSingle
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ data: null, error: null });

    mockSupabase.builder.in.mockResolvedValue({
      data: [{ key: 'working_days', value: '1,2,3,4,5' }],
      error: null,
    });

    // 2026-08-16 is Sunday
    const slots = await getTimeSlotsForDate('2026-08-16');
    expect(slots).toEqual([]);
  });

  it('generates correct slot format with minutes', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: {
        value: JSON.stringify({
          '1': { enabled: true, open: '08:30', close: '10:30' },
          '2': { enabled: true, open: '08:30', close: '10:30' },
          '3': { enabled: true, open: '08:30', close: '10:30' },
          '4': { enabled: true, open: '08:30', close: '10:30' },
          '5': { enabled: true, open: '08:30', close: '10:30' },
          '6': { enabled: true, open: '08:30', close: '10:30' },
          '0': { enabled: false, open: '09:00', close: '14:00' },
        }),
      },
      error: null,
    });

    // 2026-08-24 is Monday
    const slots = await getTimeSlotsForDate('2026-08-24');
    expect(slots).toContain('08:30');
    expect(slots).toContain('09:30');
    expect(slots).not.toContain('10:30');
  });

  it('evicts oldest cache entry when cache is full', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // Fill cache with 100 entries (different dates)
    // Fill cache with 100 entries
    for (let i = 0; i < 100; i++) {
      const day = String((i % 30) + 1).padStart(2, '0');
      await getTimeSlotsForDate(`2026-01-${day}`);
    }

    // 101st entry triggers eviction
    const slots = await getTimeSlotsForDate('2026-12-01');
    expect(slots).toBeDefined();
  });

  it('evicts cache for disabled day', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // Fill cache to max
    for (let i = 0; i < 100; i++) {
      const day = String((i % 30) + 1).padStart(2, '0');
      await getTimeSlotsForDate(`2026-02-${day}`);
    }

    // Sunday (disabled) triggers eviction
    const slots = await getTimeSlotsForDate('2026-03-01');
    expect(slots).toEqual([]);
  });

  it('handles lunch_break not matching current day', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: {
        value: JSON.stringify({
          ...FULL_WEEK,
          lunch_break: {
            enabled: true,
            start: '12:00',
            end: '13:00',
            days: [2, 3], // Not Monday (1)
          },
        }),
      },
      error: null,
    });

    // 2026-09-07 is Monday
    const slots = await getTimeSlotsForDate('2026-09-07');
    expect(slots).toContain('12:00');
  });

  it('handles lunch_break disabled', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: {
        value: JSON.stringify({
          ...FULL_WEEK,
          lunch_break: {
            enabled: false,
            start: '12:00',
            end: '13:00',
            days: [1],
          },
        }),
      },
      error: null,
    });

    // 2026-09-14 is Monday
    const slots = await getTimeSlotsForDate('2026-09-14');
    expect(slots).toContain('12:00');
  });

  it('returns empty for disabled day and evicts cache', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // Fill cache to max
    for (let i = 0; i < 100; i++) {
      const day = String((i % 30) + 1).padStart(2, '0');
      await getTimeSlotsForDate(`2026-10-${day}`);
    }

    // Sunday (disabled) triggers eviction
    const slots = await getTimeSlotsForDate('2026-11-01');
    expect(slots).toEqual([]);
  });

  it('handles fallback with empty rows', async () => {
    mockSupabase.builder.maybeSingle
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.builder.in.mockResolvedValue({ data: [], error: null });

    // 2026-11-08 is Sunday
    const slots = await getTimeSlotsForDate('2026-11-08');
    expect(slots).toEqual([]);
  });

  it('evicts cache for disabled day via fallback path', async () => {
    mockSupabase.builder.maybeSingle
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ data: null, error: null });
    mockSupabase.builder.in.mockResolvedValue({
      data: [{ key: 'working_days', value: '1,2,3,4,5' }],
      error: null,
    });

    // Fill cache to max
    for (let i = 0; i < 100; i++) {
      const day = String((i % 30) + 1).padStart(2, '0');
      await getTimeSlotsForDate(`2026-12-${day}`);
    }

    // Sunday via fallback path
    const slots = await getTimeSlotsForDate('2027-01-03');
    expect(slots).toEqual([]);
  });

  it('generates slots for Saturday with shorter hours', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(FULL_WEEK) },
      error: null,
    });

    // 2026-07-25 is Saturday
    const slots = await getTimeSlotsForDate('2026-07-25');
    expect(slots).toContain('08:00');
    expect(slots).toContain('09:00');
    expect(slots).toContain('13:00');
    expect(slots).not.toContain('14:00');
  });
});

describe('getTimeSlotsForDate com barberId (horário por barbeiro)', () => {
  const SHORT_WEEK = {
    '1': { enabled: true, open: '10:00', close: '12:00' },
    '2': { enabled: true, open: '10:00', close: '12:00' },
    '3': { enabled: true, open: '10:00', close: '12:00' },
    '4': { enabled: true, open: '10:00', close: '12:00' },
    '5': { enabled: true, open: '10:00', close: '12:00' },
    '6': { enabled: true, open: '10:00', close: '12:00' },
    '0': { enabled: false, open: '09:00', close: '14:00' },
  };
  const GLOBAL_WEEK = {
    '1': { enabled: true, open: '08:00', close: '18:00' },
    '2': { enabled: true, open: '08:00', close: '18:00' },
    '3': { enabled: true, open: '08:00', close: '18:00' },
    '4': { enabled: true, open: '08:00', close: '18:00' },
    '5': { enabled: true, open: '08:00', close: '18:00' },
    '6': { enabled: true, open: '08:00', close: '14:00' },
    '0': { enabled: false, open: '09:00', close: '14:00' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('usa o horário próprio do barbeiro quando ele tem override', async () => {
    // jsonb do PostgREST chega como objeto
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { barber_hours: SHORT_WEEK },
      error: null,
    });

    // 2026-07-27 é segunda-feira
    const slots = await getTimeSlotsForDate('2026-07-27', 'barber-1');
    expect(slots).toEqual(['10:00', '11:00']);
    // Consultou barbers (override) e não precisou cair no settings
    expect(mockSupabase.supabase.from).toHaveBeenCalledWith('barbers');
    expect(mockSupabase.supabase.from).not.toHaveBeenCalledWith('settings');
  });

  it('aceita barber_hours como string JSON (fallback de texto)', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { barber_hours: JSON.stringify(SHORT_WEEK) },
      error: null,
    });

    // 2026-08-03 é segunda-feira
    const slots = await getTimeSlotsForDate('2026-08-03', 'barber-1');
    expect(slots).toEqual(['10:00', '11:00']);
  });

  it('cai no horário padrão quando o barbeiro não tem override', async () => {
    mockSupabase.builder.maybeSingle
      .mockResolvedValueOnce({ data: { barber_hours: null }, error: null }) // barbers
      .mockResolvedValueOnce({
        data: { value: JSON.stringify(GLOBAL_WEEK) },
        error: null,
      }); // settings

    // 2026-08-10 é segunda-feira
    const slots = await getTimeSlotsForDate('2026-08-10', 'barber-1');
    expect(slots).toContain('08:00');
    expect(slots).not.toContain('18:00');
    expect(mockSupabase.supabase.from).toHaveBeenCalledWith('settings');
  });

  it('cache separa barbeiros diferentes na mesma data', async () => {
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { barber_hours: SHORT_WEEK },
      error: null,
    });

    // 2026-08-17 é segunda-feira
    const slotsWithBarber = await getTimeSlotsForDate('2026-08-17', 'barber-1');
    expect(slotsWithBarber).toEqual(['10:00', '11:00']);

    // Sem barbeiro (global) na mesma data: nova chamada, não usa cache do barbeiro
    mockSupabase.builder.maybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(GLOBAL_WEEK) },
      error: null,
    });
    const globalSlots = await getTimeSlotsForDate('2026-08-17');
    expect(globalSlots).toContain('08:00');
    expect(globalSlots).not.toEqual(['10:00', '11:00']);
    expect(mockSupabase.supabase.from).toHaveBeenCalledTimes(2);
  });
});
