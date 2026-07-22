import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGallery } from './useGallery';
import type { GalleryImage } from './useGalleryData';

const mockImages: GalleryImage[] = [
  { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0 },
  { id: 'img-2', image_url: 'url-2', alt: 'Foto 2', position: 1 },
  { id: 'img-3', image_url: 'url-3', alt: 'Foto 3', position: 2 },
];

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockLoadImages = vi.fn();
let mockImagesState: GalleryImage[] = [...mockImages];
const mockSetImages = vi.fn((newImages: GalleryImage[]) => {
  mockImagesState = newImages;
});

vi.mock('./useToast', () => ({
  useToast: () => ({
    toast: { show: false, message: '', type: 'success' as const },
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('./useGalleryData', () => ({
  useGalleryData: () => ({
    images: mockImagesState,
    setImages: mockSetImages,
    loadImages: mockLoadImages,
  }),
}));

vi.mock('./useGalleryUpload', () => ({
  useGalleryUpload: () => ({
    uploading: false,
    fileInputRef: { current: null },
    openFilePicker: vi.fn(),
    handleUpload: vi.fn(),
    MAX_PHOTOS: 20,
  }),
}));

vi.mock('./useGallerySelection', () => ({
  useGallerySelection: () => ({
    selectedImages: [],
    selectionMode: false,
    confirmBulkDelete: false,
    deleting: null,
    toggleSelect: vi.fn(),
    clearSelection: vi.fn(),
    setSelectionMode: vi.fn(),
    handleDelete: vi.fn(),
    setConfirmBulkDelete: vi.fn(),
    selectAll: vi.fn(),
  }),
}));

vi.mock('./useGalleryPreview', () => ({
  useGalleryPreview: () => ({
    previewImage: null,
    previewIndex: 0,
    touchStart: null,
    setPreviewImage: vi.fn(),
    setPreviewIndex: vi.fn(),
    setTouchStart: vi.fn(),
    goToPrevPreview: vi.fn(),
    goToNextPreview: vi.fn(),
  }),
}));

// Use vi.hoisted to ensure the mock function is defined before vi.mock is hoisted
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

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImagesState = [...mockImages];
  });

  it('returns composed state from sub-hooks', () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.images).toEqual(mockImages);
    expect(result.current.MAX_PHOTOS).toBe(20);
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

  it('provides selection handlers', () => {
    const { result } = renderHook(() => useGallery());

    expect(typeof result.current.toggleSelect).toBe('function');
    expect(typeof result.current.clearSelection).toBe('function');
    expect(typeof result.current.selectAll).toBe('function');
  });

  it('provides preview handlers', () => {
    const { result } = renderHook(() => useGallery());

    expect(typeof result.current.setPreviewImage).toBe('function');
    expect(typeof result.current.goToPrevPreview).toBe('function');
    expect(typeof result.current.goToNextPreview).toBe('function');
  });

  it('provides move handlers', () => {
    const { result } = renderHook(() => useGallery());

    expect(typeof result.current.handleMove).toBe('function');
    expect(typeof result.current.handleMoveToPosition).toBe('function');
    expect(typeof result.current.setShowMoveModal).toBe('function');
    expect(typeof result.current.setMoveTarget).toBe('function');
  });

  it('provides delete state', () => {
    const { result } = renderHook(() => useGallery());

    expect(typeof result.current.setConfirmDelete).toBe('function');
    expect(typeof result.current.handleDelete).toBe('function');
  });

  it('handles move up successfully', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMove('img-2', 'up');
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles move down successfully', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMove('img-2', 'down');
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('does not move first image up', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMove('img-1', 'up');
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('does not move last image down', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMove('img-3', 'down');
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('does nothing for non-existent image', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMove('non-existent', 'up');
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles move to position - same position does nothing', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.handleMoveToPosition(1);
    });

    expect(result.current.showMoveModal).toBe(false);
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

  it('sets moveTarget', () => {
    const { result } = renderHook(() => useGallery());

    act(() => {
      result.current.setMoveTarget(3);
    });
    expect(result.current.moveTarget).toBe(3);
  });

  it('sets confirmDelete', () => {
    const { result } = renderHook(() => useGallery());

    act(() => {
      result.current.setConfirmDelete('img-1');
    });
    expect(result.current.confirmDelete).toBe('img-1');
  });
});
