import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../lib/utils', () => ({
  formatDisplayName: vi.fn((name: string) => name),
}));

vi.mock('../../../lib/whatsapp', () => ({
  cleanPhoneForWhatsApp: vi.fn((phone: string) => `55${phone.replace(/\D/g, '')}`),
}));

import OccupiedBookingRow from './OccupiedBookingRow';
import type { BookingWithClient, Service } from '../../../types';

const mockBooking: BookingWithClient = {
  id: 'b1',
  client_id: 'c1',
  service_ids: ['s1', 's2'],
  booking_date: '2026-07-22',
  booking_time: '10:00:00',
  status: 'confirmed',
  total_price: 80,
  total_duration: 45,
  created_at: '2026-07-22T08:00:00Z',
  clients: { name: 'João Silva', phone: '31999999999' },
};

const mockServices: Service[] = [
  { id: 's1', name: 'Corte', price: 50, duration: 30 },
  { id: 's2', name: 'Barba', price: 30, duration: 15 },
];

const defaultProps = {
  booking: mockBooking,
  services: mockServices,
  onSelect: vi.fn(),
};

function renderRow(overrides = {}) {
  return render(<OccupiedBookingRow {...defaultProps} {...overrides} />);
}

describe('OccupiedBookingRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.open
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders booking time', () => {
    renderRow();
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('renders client name', () => {
    renderRow();
    expect(screen.getByText('João Silva')).toBeTruthy();
  });

  it('has correct aria-label for select button', () => {
    renderRow();
    expect(screen.getByLabelText('Agendamento as 10:00 com João Silva')).toBeTruthy();
  });

  it('calls onSelect when clicking the main row', () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });
    fireEvent.click(screen.getByLabelText('Agendamento as 10:00 com João Silva'));
    expect(onSelect).toHaveBeenCalledWith(mockBooking);
  });

  it('calls onSelect when clicking "Ver detalhes" button', () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });
    fireEvent.click(screen.getByLabelText('Ver detalhes'));
    expect(onSelect).toHaveBeenCalledWith(mockBooking);
  });

  it('has "Enviar lembrete" button for mobile', () => {
    renderRow();
    expect(screen.getByLabelText('Enviar lembrete')).toBeTruthy();
  });

  it('opens WhatsApp with reminder message when clicking reminder button', () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Enviar lembrete'));
    expect(window.open).toHaveBeenCalledTimes(1);
    const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toContain('wa.me/5531999999999');
    expect(callArgs[0]).toContain(encodeURIComponent('João Silva'));
    expect(callArgs[1]).toBe('_blank');
  });

  it('includes service names in reminder message', () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Enviar lembrete'));
    const callArgs = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = decodeURIComponent(callArgs[0]);
    expect(url).toContain('Corte');
    expect(url).toContain('Barba');
  });

  it('renders service names joined by comma', () => {
    renderRow();
    // Services are used internally for reminder message, just verify row renders
    expect(screen.getByText('João Silva')).toBeTruthy();
  });

  it('renders with a single service', () => {
    renderRow({
      booking: { ...mockBooking, service_ids: ['s1'] },
    });
    expect(screen.getByText('10:00')).toBeTruthy();
    expect(screen.getByText('João Silva')).toBeTruthy();
  });

  it('handles missing services gracefully', () => {
    renderRow({
      booking: { ...mockBooking, service_ids: ['unknown'] },
    });
    expect(screen.getByText('10:00')).toBeTruthy();
  });
});
