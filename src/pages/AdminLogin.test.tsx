import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminLogin from './AdminLogin';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza titulo', () => {
    renderWithRouter(<AdminLogin />);
    expect(screen.getByText(/Black Diamond/i)).toBeInTheDocument();
  });

  it('renderiza campo de email', () => {
    renderWithRouter(<AdminLogin />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('renderiza campo de senha', () => {
    renderWithRouter(<AdminLogin />);
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument();
  });

  it('renderiza botao de login', () => {
    renderWithRouter(<AdminLogin />);
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('renderiza link esqueceu senha', () => {
    renderWithRouter(<AdminLogin />);
    expect(screen.getByText(/esqueceu/i)).toBeInTheDocument();
  });
});
