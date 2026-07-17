import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGalleryData } from './useGalleryData';

const mockFrom = vi.fn();

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

describe('useGalleryData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({
          data: [
            {
              id: 'img-1',
              image_url: 'url-1',
              alt: 'Foto 1',
              position: 0,
              created_at: '2026-01-01',
            },
            {
              id: 'img-2',
              image_url: 'url-2',
              alt: 'Foto 2',
              position: 1,
              created_at: '2026-01-02',
            },
          ],
          error: null,
        })
      ),
    };
    mockFrom.mockReturnValue(chain);
  });

  it('loads images on mount', async () => {
    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => {
      expect(result.current.images.length).toBe(2);
    });
    expect(result.current.images[0].id).toBe('img-1');
    expect(result.current.images[1].id).toBe('img-2');
    expect(mockFrom).toHaveBeenCalledWith('gallery_images');
  });

  it('provides setImages function', () => {
    const { result } = renderHook(() => useGalleryData());
    expect(typeof result.current.setImages).toBe('function');
  });

  it('provides loadImages function', () => {
    const { result } = renderHook(() => useGalleryData());
    expect(typeof result.current.loadImages).toBe('function');
  });

  it('starts with empty images', () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockFrom.mockReturnValue(chain);
    const { result } = renderHook(() => useGalleryData());
    expect(result.current.images).toEqual([]);
  });
});
