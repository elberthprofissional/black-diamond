import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGallerySelection } from './useGallerySelection';
import type { GalleryImage } from './useGalleryData';

const mockImages: GalleryImage[] = [
  { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0 },
  { id: 'img-2', image_url: 'url-2', alt: 'Foto 2', position: 1 },
  { id: 'img-3', image_url: 'url-3', alt: 'Foto 3', position: 2 },
];

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null })),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

describe('useGallerySelection', () => {
  const setImages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no selection', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.confirmBulkDelete).toBe(false);
    expect(result.current.deleting).toBeNull();
  });

  it('toggles selection of an image', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.toggleSelect('img-1');
    });
    expect(result.current.selectedImages).toEqual(['img-1']);
    expect(result.current.isSelecting).toBe(true);
  });

  it('toggles deselection of an image', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.toggleSelect('img-1');
    });
    expect(result.current.selectedImages).toEqual([]);
  });

  it('selects multiple images', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.toggleSelect('img-2');
    });
    expect(result.current.selectedImages).toEqual(['img-1', 'img-2']);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.clearSelection();
    });
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.selectionMode).toBe(false);
  });

  it('handles Ctrl+A to select all', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    });
    expect(result.current.selectedImages).toHaveLength(3);
    expect(result.current.selectionMode).toBe(true);
  });

  it('handles Escape to clear selection', () => {
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.toggleSelect('img-1');
    });
    expect(result.current.isSelecting).toBe(true);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.selectionMode).toBe(false);
  });

  it('handles long press start to enter selection mode', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.handleLongPressStart('img-1');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.selectionMode).toBe(true);
    expect(result.current.selectedImages).toContain('img-1');
    vi.useRealTimers();
  });

  it('cancels long press on move', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.handleLongPressStart('img-1');
      result.current.handleLongPressMove();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.selectionMode).toBe(false);
    vi.useRealTimers();
  });

  it('cancels long press on end', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGallerySelection(mockImages, setImages));
    act(() => {
      result.current.handleLongPressStart('img-1');
      result.current.handleLongPressEnd();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.selectionMode).toBe(false);
    vi.useRealTimers();
  });
});
