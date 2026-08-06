import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGallery } from './useGallery';
import type { GalleryImage } from '../types';

const mockImages: GalleryImage[] = [
  { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0 },
  { id: 'img-2', image_url: 'url-2', alt: 'Foto 2', position: 1 },
  { id: 'img-3', image_url: 'url-3', alt: 'Foto 3', position: 2 },
];

const mockSetImages = vi.fn();

vi.mock('./useToast', () => ({
  useToast: () => ({
    toast: { show: false, message: '', type: 'success' as const },
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('./useGalleryData', () => ({
  useGalleryData: () => ({
    images: mockImages,
    setImages: mockSetImages,
    loadImages: vi.fn(),
    uploading: false,
    fileInputRef: { current: null },
    openFilePicker: vi.fn(),
    handleUpload: vi.fn(),
    MAX_PHOTOS: 5,
  }),
}));

const mockSupabaseResolve = vi.hoisted(() =>
  vi.fn((_resolve: (v: { data: null; error: null | Error }) => void) => {
    _resolve({ data: null, error: null });
    return { catch: vi.fn() };
  })
);

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: mockSupabaseResolve,
    }),
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

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns composed state', () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.images).toEqual(mockImages);
    expect(result.current.MAX_PHOTOS).toBe(5);
    expect(result.current.uploading).toBe(false);
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.previewImage).toBeNull();
    expect(result.current.showMoveModal).toBe(false);
    expect(result.current.confirmDelete).toBeNull();
    expect(result.current.deleting).toBeNull();
  });

  it('provides upload handlers', () => {
    const { result } = renderHook(() => useGallery());
    expect(typeof result.current.openFilePicker).toBe('function');
    expect(typeof result.current.handleUpload).toBe('function');
    expect(typeof result.current.fileInputRef).toBe('object');
  });

  // === Preview tests ===
  it('initializes with null preview', () => {
    const { result } = renderHook(() => useGallery());
    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewIndex).toBe(0);
    expect(result.current.touchStart).toBeNull();
  });

  it('sets preview image', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
    });
    expect(result.current.previewImage).toEqual(mockImages[1]);
  });

  it('navigates to previous preview', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      result.current.goToPrevPreview();
    });
    expect(result.current.previewImage).toEqual(mockImages[0]);
    expect(result.current.previewIndex).toBe(0);
  });

  it('navigates to next preview', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      result.current.goToNextPreview();
    });
    expect(result.current.previewImage).toEqual(mockImages[2]);
    expect(result.current.previewIndex).toBe(2);
  });

  it('wraps around from first to last on prev', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[0]);
      result.current.setPreviewIndex(0);
    });
    act(() => {
      result.current.goToPrevPreview();
    });
    expect(result.current.previewImage).toEqual(mockImages[2]);
    expect(result.current.previewIndex).toBe(2);
  });

  it('responds to ArrowLeft keyboard event', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.previewImage).toEqual(mockImages[0]);
  });

  it('responds to Escape to close preview', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
    });
    expect(result.current.previewImage).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.previewImage).toBeNull();
  });

  // === Selection tests ===
  it('toggles selection on', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.toggleSelect('img-1');
    });
    expect(result.current.selectedImages).toEqual(['img-1']);
    expect(result.current.selectionMode).toBe(true);
  });

  it('toggles selection off', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.toggleSelect('img-1');
    });
    expect(result.current.selectedImages).toEqual([]);
  });

  it('selects multiple images', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.toggleSelect('img-2');
    });
    expect(result.current.selectedImages).toEqual(['img-1', 'img-2']);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.toggleSelect('img-1');
      result.current.clearSelection();
    });
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.selectionMode).toBe(false);
  });

  it('toggleSelect stops propagation with event', () => {
    const { result } = renderHook(() => useGallery());
    const stopPropagation = vi.fn();
    act(() => {
      result.current.toggleSelect('img-1', { stopPropagation } as unknown as React.MouseEvent);
    });
    expect(stopPropagation).toHaveBeenCalled();
  });

  // === Move tests ===
  it('provides move handlers', () => {
    const { result } = renderHook(() => useGallery());
    expect(typeof result.current.handleMove).toBe('function');
    expect(typeof result.current.handleMoveToPosition).toBe('function');
    expect(typeof result.current.setShowMoveModal).toBe('function');
    expect(typeof result.current.setMoveTarget).toBe('function');
  });

  it('sets and clears showMoveModal', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setShowMoveModal(true);
    });
    expect(result.current.showMoveModal).toBe(true);
    act(() => {
      result.current.setShowMoveModal(false);
    });
    expect(result.current.showMoveModal).toBe(false);
  });

  it('sets confirmDelete', () => {
    const { result } = renderHook(() => useGallery());
    act(() => {
      result.current.setConfirmDelete('img-1');
    });
    expect(result.current.confirmDelete).toBe('img-1');
  });

  it('does nothing for non-existent image move', async () => {
    const { result } = renderHook(() => useGallery());
    await act(async () => {
      await result.current.handleMove('non-existent', 'up');
    });
  });

  it('does not move first image up', async () => {
    const { result } = renderHook(() => useGallery());
    await act(async () => {
      await result.current.handleMove('img-1', 'up');
    });
  });

  it('does not move last image down', async () => {
    const { result } = renderHook(() => useGallery());
    await act(async () => {
      await result.current.handleMove('img-3', 'down');
    });
  });

  it('cancels move-to-position without preview', async () => {
    const { result } = renderHook(() => useGallery());
    await act(async () => {
      await result.current.handleMoveToPosition(1);
    });
    expect(result.current.showMoveModal).toBe(false);
  });
});
