import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalleryPreview } from './useGalleryPreview';
import type { GalleryImage } from './useGalleryData';

const mockImages: GalleryImage[] = [
  { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0 },
  { id: 'img-2', image_url: 'url-2', alt: 'Foto 2', position: 1 },
  { id: 'img-3', image_url: 'url-3', alt: 'Foto 3', position: 2 },
];

describe('useGalleryPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null preview', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewIndex).toBe(0);
    expect(result.current.touchStart).toBeNull();
  });

  it('sets preview image', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
    });
    expect(result.current.previewImage).toEqual(mockImages[1]);
  });

  it('navigates to previous preview', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
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
    const { result } = renderHook(() => useGalleryPreview(mockImages));
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
    const { result } = renderHook(() => useGalleryPreview(mockImages));
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

  it('wraps around from last to first on next', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[2]);
      result.current.setPreviewIndex(2);
    });
    act(() => {
      result.current.goToNextPreview();
    });
    expect(result.current.previewImage).toEqual(mockImages[0]);
    expect(result.current.previewIndex).toBe(0);
  });

  it('does nothing on prev with empty images', () => {
    const { result } = renderHook(() => useGalleryPreview([]));
    act(() => {
      result.current.goToPrevPreview();
    });
    expect(result.current.previewImage).toBeNull();
  });

  it('does nothing on next with empty images', () => {
    const { result } = renderHook(() => useGalleryPreview([]));
    act(() => {
      result.current.goToNextPreview();
    });
    expect(result.current.previewImage).toBeNull();
  });

  it('responds to ArrowLeft keyboard event', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.previewImage).toEqual(mockImages[0]);
  });

  it('responds to ArrowRight keyboard event', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.previewImage).toEqual(mockImages[2]);
  });

  it('closes preview on Escape', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
    });
    expect(result.current.previewImage).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.previewImage).toBeNull();
  });

  it("handles 'a' and 'd' keys for navigation", () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setPreviewImage(mockImages[1]);
      result.current.setPreviewIndex(1);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    expect(result.current.previewImage).toEqual(mockImages[0]);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    });
    expect(result.current.previewImage).toEqual(mockImages[1]);
  });

  it('sets touchStart', () => {
    const { result } = renderHook(() => useGalleryPreview(mockImages));
    act(() => {
      result.current.setTouchStart(100);
    });
    expect(result.current.touchStart).toBe(100);
  });
});
