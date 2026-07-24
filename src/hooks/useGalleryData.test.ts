import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGalleryData } from './useGalleryData';

const mockSupabaseFrom = vi.fn();
const mockSupabaseStorageFrom = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

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

vi.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

function createMockFile(name = 'test.jpg', size = 100 * 1024, type = 'image/jpeg'): File {
  return new File(['x'.repeat(size)], name, { type });
}

let OriginalImage: typeof Image;

class MockImage {
  static _instances: MockImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  _src = '';
  constructor() {
    MockImage._instances.push(this);
  }
  set src(_val: string) {
    this._src = _val;
    queueMicrotask(() => {
      if (this.onload) this.onload();
    });
  }
  get src() {
    return this._src;
  }
}

describe('useGalleryData', () => {
  let origCreateElement: typeof document.createElement;
  let canvasMock: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    MockImage._instances = [];

    OriginalImage = globalThis.Image;
    (globalThis as unknown as Record<string, unknown>).Image = MockImage;

    origCreateElement = document.createElement.bind(document);

    canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toBlob: vi.fn((_cb: BlobCallback) => {
        _cb(new Blob(['webp-data'], { type: 'image/webp' }));
      }),
    };

    document.createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    document.createElement = origCreateElement;
    (globalThis as unknown as Record<string, unknown>).Image = OriginalImage;
  });

  // === Data tests ===
  it('loads images on mount', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({
          data: [
            { id: 'img-1', image_url: 'url-1', alt: 'Foto 1', position: 0, created_at: '2026-01-01' },
            { id: 'img-2', image_url: 'url-2', alt: 'Foto 2', position: 1, created_at: '2026-01-02' },
          ],
          error: null,
        })
      ),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => {
      expect(result.current.images.length).toBe(2);
    });
    expect(result.current.images[0].id).toBe('img-1');
    expect(result.current.images[1].id).toBe('img-2');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('gallery_images');
  });

  it('starts with empty images', () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);
    const { result } = renderHook(() => useGalleryData());
    expect(result.current.images).toEqual([]);
  });

  // === Upload tests ===
  it('returns upload state', () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    expect(result.current.uploading).toBe(false);
    expect(result.current.MAX_PHOTOS).toBe(20);
    expect(typeof result.current.openFilePicker).toBe('function');
    expect(typeof result.current.handleUpload).toBe('function');
    expect(result.current.fileInputRef.current).toBeNull();
  });

  it('validates file type - rejects non-image', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images).toEqual([]));

    const badFile = createMockFile('test.txt', 100, 'text/plain');
    const event = { target: { files: [badFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).toHaveBeenCalledWith('Envie apenas imagens');
  });

  it('validates file size - rejects > 2MB', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images).toEqual([]));

    const bigFile = createMockFile('test.jpg', 3 * 1024 * 1024, 'image/jpeg');
    const event = { target: { files: [bigFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).toHaveBeenCalledWith('Imagem muito grande (max 2MB)');
  });

  it('validates max photos limit', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({
          data: Array.from({ length: 20 }, (_, i) => ({
            id: `img-${i}`,
            image_url: `url-${i}`,
            alt: `Foto ${i}`,
            position: i,
            created_at: '2026-01-01',
          })),
          error: null,
        })
      ),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images.length).toBe(20));

    const file = createMockFile('test.jpg');
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).toHaveBeenCalledWith('Máximo de 20 fotos');
  });

  it('handles no file selected', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images).toEqual([]));

    const event = { target: { files: [] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles null files', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images).toEqual([]));

    const event = { target: { files: null } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handles storage error during upload', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null })),
    };
    mockSupabaseFrom.mockReturnValue(chain);

    mockSupabaseStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: 'Storage full' } }),
      getPublicUrl: vi.fn(),
    });

    const { result } = renderHook(() => useGalleryData());
    await waitFor(() => expect(result.current.images).toEqual([]));

    const file = createMockFile('test.jpg');
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      await result.current.handleUpload(event);
    });
    expect(mockShowError).toHaveBeenCalledWith('Erro: Storage full');
  });
});
