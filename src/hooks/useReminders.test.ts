import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminders } from './useReminders';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockGetTemplates = vi.fn();
const mockCreateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('../lib/api/templates', () => ({
  getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args),
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

// Mock window.open
const mockWindowOpen = vi.fn();

beforeEach(() => {
  mockGetTemplates.mockResolvedValue([]);
  mockCreateTemplate.mockResolvedValue({});
  mockDeleteTemplate.mockResolvedValue(undefined);
});

describe('useReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.open = mockWindowOpen;
  });

  it('initializes with empty reminders sent', () => {
    const { result } = renderHook(() => useReminders());
    expect(result.current.remindersSent).toEqual({});
  });

  it('loads seasonal templates on initialization', async () => {
    const { result } = renderHook(() => useReminders());
    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThanOrEqual(1);
    });
    expect(result.current.templates[0]).toHaveProperty('id');
    expect(result.current.templates[0]).toHaveProperty('name');
    expect(result.current.templates[0]).toHaveProperty('body');
    expect(result.current.templates[0]).toHaveProperty('key', 'reminder');
  });

  it('persists templates to localStorage', async () => {
    const { result } = renderHook(() => useReminders());
    await waitFor(() => {
      const saved = localStorage.getItem('barber_templates');
      expect(saved).not.toBeNull();
    });
    const saved = localStorage.getItem('barber_templates');
    const parsed = JSON.parse(saved!);
    expect(parsed.length).toBe(result.current.templates.length);
  });

  it('loads existing templates from localStorage', () => {
    const existingTemplates = [
      {
        id: 'test-1',
        key: 'reminder',
        name: 'Test Template',
        body: 'Test body',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    localStorage.setItem('barber_templates', JSON.stringify(existingTemplates));

    const { result } = renderHook(() => useReminders());
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].name).toBe('Test Template');
  });

  it('marks reminder as sent', () => {
    const { result } = renderHook(() => useReminders());
    act(() => {
      result.current.markReminderSent('client-1');
    });
    expect(result.current.remindersSent['client-1']).toBeDefined();
    // Should persist to localStorage
    const saved = localStorage.getItem('barber_reminders_sent');
    expect(saved).not.toBeNull();
  });

  it('checks if reminder was recently sent', () => {
    const { result } = renderHook(() => useReminders());
    act(() => {
      result.current.markReminderSent('client-1');
    });
    expect(result.current.isReminderRecent('client-1')).toBe(true);
  });

  it('returns false for clients with no reminder', () => {
    const { result } = renderHook(() => useReminders());
    expect(result.current.isReminderRecent('nonexistent')).toBe(false);
  });

  it('invites reminder sent from localStorage on init', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('barber_reminders_sent', JSON.stringify({ 'client-1': yesterday }));

    const { result } = renderHook(() => useReminders());
    expect(result.current.remindersSent['client-1']).toBe(yesterday);
    expect(result.current.isReminderRecent('client-1')).toBe(true);
  });

  it('sends WhatsApp message with template', () => {
    const { result } = renderHook(() => useReminders());
    const template = 'Olá {{nome}}, lembrete do seu horário!';

    act(() => {
      result.current.sendWithTemplate('31980159559', template, 'client-1');
    });

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/5531980159559'),
      '_blank'
    );
  });

  it('shows error if phone is empty', () => {
    const { result } = renderHook(() => useReminders());

    act(() => {
      result.current.sendWithTemplate('', 'template', 'client-1');
    });

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('sem telefone'));
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('handles popup blocker', () => {
    mockWindowOpen.mockReturnValue(null);
    const { result } = renderHook(() => useReminders());

    act(() => {
      result.current.sendWithTemplate('31980159559', 'test', 'client-1');
    });

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Bloqueador'));
  });

  it('saves custom template', async () => {
    const { result } = renderHook(() => useReminders());

    // Aguarda templates sazonais carregarem antes de adicionar um custom
    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThanOrEqual(2);
    });
    const seasonalCount = result.current.templates.length;

    await act(async () => {
      await result.current.handleSaveTemplate('Custom template message');
    });

    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('Lembrete salvo'));
    expect(result.current.templates.length).toBe(seasonalCount + 1);
  });

  it('deletes a template', async () => {
    const { result } = renderHook(() => useReminders());
    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThanOrEqual(1);
    });
    const firstId = result.current.templates[0].id;
    const initialCount = result.current.templates.length;

    await act(async () => {
      await result.current.handleDeleteTemplate(firstId);
    });

    expect(result.current.templates).toHaveLength(initialCount - 1);
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('excluído'));
  });
});
