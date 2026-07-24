import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Gallery from './Gallery';

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
      expect(screen.getByText(/MEUS/)).toBeInTheDocument();
      expect(screen.getByText(/TRABALHOS/)).toBeInTheDocument();
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
      expect(placeholders.length).toBe(4);
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
});
