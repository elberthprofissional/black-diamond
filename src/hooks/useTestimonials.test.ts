import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTestimonials } from './useTestimonials';
import type { Testimonial } from '../types';

vi.mock('../lib/api/testimonials', () => ({
  getAllTestimonials: vi.fn(),
  updateTestimonial: vi.fn(),
  createTestimonial: vi.fn(),
  deleteTestimonial: vi.fn(),
}));

const mockTestimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'João',
    rating: 5,
    text: 'Excelente serviço!',
    is_active: true,
    sort_order: 0,
    publish_time: '2026-07-25T10:00:00Z',
  },
  {
    id: 't2',
    name: 'Maria',
    rating: 4,
    text: 'Muito bom!',
    is_active: true,
    sort_order: 1,
    publish_time: null,
  },
  {
    id: 't3',
    name: 'Pedro',
    rating: 3,
    text: 'Bom atendimento',
    is_active: false,
    sort_order: 2,
    publish_time: null,
  },
];

describe('useTestimonials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega depoimentos no mount', async () => {
    const { getAllTestimonials } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);

    const { result } = renderHook(() => useTestimonials());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.testimonials).toHaveLength(3);
    expect(result.current.error).toBeNull();
    expect(getAllTestimonials).toHaveBeenCalledTimes(1);
  });

  it('trata erro no carregamento', async () => {
    const { getAllTestimonials } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockRejectedValue(new Error('Erro ao carregar'));

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erro ao carregar depoimentos');
    expect(result.current.testimonials).toEqual([]);
  });

  it('toggleActive alterna is_active do depoimento', async () => {
    const { getAllTestimonials, updateTestimonial } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);
    vi.mocked(updateTestimonial).mockResolvedValue();

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleActive('t1', true);
    });

    // is_active deve ter sido alternado para false no state local
    const updated = result.current.testimonials.find((t) => t.id === 't1');
    expect(updated?.is_active).toBe(false);
    expect(updateTestimonial).toHaveBeenCalledWith('t1', { is_active: false });
  });

  it('toggleActive lida com erro na API', async () => {
    const { getAllTestimonials, updateTestimonial } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);
    vi.mocked(updateTestimonial).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleActive('t1', true);
    });

    expect(result.current.error).toBe('Erro ao atualizar depoimento');
  });

  it('addTestimonial adiciona novo depoimento à lista', async () => {
    const { getAllTestimonials, createTestimonial } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);
    const newTestimonial: Testimonial = {
      id: 't4',
      name: 'Ana',
      rating: 5,
      text: 'Adorei!',
      is_active: true,
      sort_order: 3,
      publish_time: null,
    };
    vi.mocked(createTestimonial).mockResolvedValue(newTestimonial);

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addTestimonial({ name: 'Ana', rating: 5, text: 'Adorei!' });
    });

    expect(result.current.testimonials).toHaveLength(4);
    expect(result.current.testimonials[3].name).toBe('Ana');
  });

  it('deleteTestimonial remove depoimento da lista', async () => {
    const { getAllTestimonials, deleteTestimonial } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);
    vi.mocked(deleteTestimonial).mockResolvedValue();

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteTestimonial('t1');
    });

    expect(result.current.testimonials).toHaveLength(2);
    expect(result.current.testimonials.find((t) => t.id === 't1')).toBeUndefined();
    expect(deleteTestimonial).toHaveBeenCalledWith('t1');
  });

  it('deleteTestimonial lida com erro na API', async () => {
    const { getAllTestimonials, deleteTestimonial } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);
    vi.mocked(deleteTestimonial).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteTestimonial('t1');
    });

    expect(result.current.error).toBe('Erro ao deletar depoimento');
  });

  it('refresh recarrega depoimentos', async () => {
    const { getAllTestimonials } = await import('../lib/api/testimonials');
    vi.mocked(getAllTestimonials).mockResolvedValue(mockTestimonials);

    const { result } = renderHook(() => useTestimonials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getAllTestimonials).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(getAllTestimonials).toHaveBeenCalledTimes(2);
  });
});
