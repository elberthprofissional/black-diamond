import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarberSettingsProvider } from '../contexts/BarberSettingsContext';
import Gallery from './Gallery';

// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

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
