import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/Navbar', () => ({ default: () => <div>Navbar</div> }));
vi.mock('../components/Hero', () => ({
  default: ({ onBookingClick: _onBookingClick }: { onBookingClick: () => void }) => <div>Hero</div>,
}));
vi.mock('../components/About', () => ({ default: () => <div>About</div> }));
vi.mock('../components/Services', () => ({
  default: ({ onBookingClick: _onBookingClick }: { onBookingClick: () => void }) => (
    <div>Services</div>
  ),
}));
vi.mock('../components/TestimonialsSlider', () => ({ default: () => <div>Testimonials</div> }));
vi.mock('../components/Gallery', () => ({ default: () => <div>Gallery</div> }));
vi.mock('../components/Location', () => ({ default: () => <div>Location</div> }));
vi.mock('../components/Footer', () => ({ default: () => <div>Footer</div> }));

import Home from './Home';

describe('Home', () => {
  it('renderiza todas as secoes', () => {
    render(<Home />);
    expect(screen.getByText('Navbar')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Testimonials')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
