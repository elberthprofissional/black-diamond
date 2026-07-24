import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Location from './Location';

describe('Location', () => {
  it('renderiza o iframe do Google Maps', () => {
    render(<Location />);
    const iframe = screen.getByTitle(/Localização da Black Diamond/);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('allowFullScreen');
  });

  it('tem secao com id=localizacao para navegacao', () => {
    render(<Location />);
    const section = document.getElementById('localizacao');
    expect(section).toBeInTheDocument();
  });
});
