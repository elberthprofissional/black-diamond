import { createElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: null, showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../hooks/useBookingWizard', () => ({
  useBookingWizard: () => ({
    step: 1,
    stepTitle: 'Serviços',
    services: [{ id: 's1', name: 'Corte', price: 35, duration: 30 }],
    selectedServices: [],
    selectedDate: '',
    selectedTime: '',
    userInfo: { name: '', phone: '' },
    totalPrice: 0,
    isStepDisabled: true,
    isSubmitting: false,
    availableSlots: [],
    existingBookings: [],
    dateContainerRef: { current: null },
    handleMouseDown: vi.fn(),
    handleMouseLeave: vi.fn(),
    handleMouseUp: vi.fn(),
    handleMouseMove: vi.fn(),
    toggleService: vi.fn(),
    setSelectedDate: vi.fn(),
    setSelectedTime: vi.fn(),
    setUserInfo: vi.fn(),
    goNext: vi.fn(),
    goBack: vi.fn(),
    handleSubmit: vi.fn(),
  }),
}));

vi.mock('../hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('framer-motion', () => {
  const FM = new Set([
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileDrag',
    'whileInView',
    'layoutId',
    'layout',
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'onAnimationStart',
    'onAnimationComplete',
  ]);
  const M =
    (tag: string) =>
    ({ children, ...p }: Record<string, unknown>) =>
      createElement(
        tag,
        Object.fromEntries(Object.entries(p).filter(([k]) => !FM.has(k))),
        children
      );
  return {
    motion: { div: M('div'), button: M('button') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../components/Booking/BookingPageView', () => ({
  default: () => <div>BookingPageView</div>,
}));

import BookingPage from './BookingPage';

describe('BookingPage', () => {
  it('renderiza BookingPageView', () => {
    render(<BookingPage />);
    expect(screen.getByText('BookingPageView')).toBeInTheDocument();
  });
});
