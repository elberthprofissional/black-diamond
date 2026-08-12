import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Gallery from './Gallery';

const mockGetGalleryImages = vi.fn();
const mockGetBarbers = vi.fn();
vi.mock('../lib/api/gallery', () => ({
  getGalleryImages: () => mockGetGalleryImages(),
}));
vi.mock('../lib/api/barbers', () => ({
  getBarbers: () => mockGetBarbers(),
}));

// Mock do Supabase
vi.mock('../lib/supabase', () => {
  const makeBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (onFulfilled: (v: unknown) => void, onRejected: (v: unknown) => void) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

describe('Gallery', () => {
  beforeEach(() => {
    mockGetGalleryImages.mockReset();
    mockGetBarbers.mockReset();
    mockGetGalleryImages.mockResolvedValue([]);
    mockGetBarbers.mockResolvedValue([]);
  });

  it('renderiza o titulo Galeria', async () => {
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Galeria')).toBeInTheDocument();
    });
  });

  it('renderiza o subtitulo Meus Trabalhos', async () => {
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Meus/)).toBeInTheDocument();
      expect(screen.getByText(/trabalhos/i)).toBeInTheDocument();
    });
  });

  it('tem secao com id=galeria para navegacao', async () => {
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      const section = document.getElementById('galeria');
      expect(section).toBeInTheDocument();
    });
  });

  it('renderiza placeholders quando nao ha fotos', async () => {
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      const placeholders = document.querySelectorAll('.lucide-image');
      // 3 polaroids com placeholder
      expect(placeholders.length).toBe(3);
    });
  });

  it('nao renderiza link do Instagram quando nao configurado', async () => {
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.queryByText(/siga a gente no/i)).not.toBeInTheDocument();
    });
  });

  it('com 2 barbeiros e fotos, mostra marquee Nossos Trabalhos com as fotos duplicadas', async () => {
    mockGetBarbers.mockResolvedValue([
      { id: 'b1', name: 'Tato', phone: '4399553590', is_active: true },
      { id: 'b2', name: 'João', phone: '4399553600', is_active: true },
    ]);
    mockGetGalleryImages.mockResolvedValue([
      { id: 'g1', image_url: '/hero1.jpg', alt: '', position: 1 },
      { id: 'g2', image_url: '/hero2.jpg', alt: '', position: 2 },
      { id: 'g3', image_url: '/corte1.jpg', alt: 'Corte 1', position: 3 },
      { id: 'g4', image_url: '/corte2.jpg', alt: 'Corte 2', position: 4 },
      { id: 'g5', image_url: '/corte3.jpg', alt: 'Corte 3', position: 5 },
    ]);
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Nossos/)).toBeInTheDocument();
      // 3 fotos (após as 2 do Hero) duplicadas para o loop infinito
      expect(document.querySelectorAll('.marquee-track img')).toHaveLength(6);
    });
  });

  it('com 2 barbeiros mas sem fotos suficientes, mantém a colagem', async () => {
    mockGetBarbers.mockResolvedValue([
      { id: 'b1', name: 'Tato', phone: '4399553590', is_active: true },
      { id: 'b2', name: 'João', phone: '4399553600', is_active: true },
    ]);
    mockGetGalleryImages.mockResolvedValue([
      { id: 'g1', image_url: '/hero1.jpg', alt: '', position: 1 },
      { id: 'g2', image_url: '/hero2.jpg', alt: '', position: 2 },
    ]);
    render(
      <BarberSettingsProvider>
        <Gallery />
      </BarberSettingsProvider>
    );
    await waitFor(() => {
      // Colagem: subtítulo continua "Meus" e placeholders aparecem
      expect(screen.getByText(/Meus/)).toBeInTheDocument();
      expect(document.querySelectorAll('.lucide-image')).toHaveLength(3);
    });
  });
});
