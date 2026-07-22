import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGalleryUpload } from './useGalleryUpload';
import type { GalleryImage } from './useGalleryData';

const mockImages: GalleryImage[] = [
  { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0 },
];

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockSupabaseStorageFrom = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockOnUploadComplete = vi.fn();

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockSupabaseStorageFrom(...args),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

function createMockFile(name = 'test.jpg', size = 100 * 1024, type = 'image/jpeg'): File {
  return new File(['x'.repeat(size)], name, { type });
}

describe('useGalleryUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));
    expect(result.current.uploading).toBe(false);
    expect(result.current.MAX_PHOTOS).toBe(20);
    expect(typeof result.current.openFilePicker).toBe('function');
    expect(typeof result.current.handleUpload).toBe('function');
    expect(result.current.fileInputRef.current).toBeNull();
  });

  it('opens file picker by clicking input', () => {
    const clickMock = vi.fn();
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));

    const input = document.createElement('input');
    input.click = clickMock;
    (result.current.fileInputRef as React.MutableRefObject<HTMLInputElement>).current = input;

    act(() => {
      result.current.openFilePicker();
    });

    expect(clickMock).toHaveBeenCalled();
  });

  it('validates file type - rejects non-image', async () => {
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));
    const badFile = createMockFile('test.txt', 100, 'text/plain');
    const event = {
      target: { files: [badFile] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleUpload(event);
    });

    expect(mockShowError).toHaveBeenCalledWith('Envie apenas imagens');
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it('validates file size - rejects > 2MB', async () => {
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));
    const bigFile = createMockFile('test.jpg', 3 * 1024 * 1024, 'image/jpeg');
    const event = {
      target: { files: [bigFile] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleUpload(event);
    });

    expect(mockShowError).toHaveBeenCalledWith('Imagem muito grande (max 2MB)');
  });

  it('validates max photos limit', async () => {
    const fullImages = Array.from({ length: 20 }, (_, i) => ({
      id: `img-${i}`,
      image_url: `url-${i}`,
      alt: `Foto ${i}`,
      position: i,
    }));
    const { result } = renderHook(() => useGalleryUpload(fullImages, mockOnUploadComplete));
    const file = createMockFile('test.jpg');
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleUpload(event);
    });

    expect(mockShowError).toHaveBeenCalledWith('Máximo de 20 fotos');
  });

  it('handles no file selected', async () => {
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));
    const event = { target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleUpload(event);
    });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it('handles null files gracefully', async () => {
    const { result } = renderHook(() => useGalleryUpload(mockImages, mockOnUploadComplete));
    const event = { target: { files: null } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleUpload(event);
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });
});
