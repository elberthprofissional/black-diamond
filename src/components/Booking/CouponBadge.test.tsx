import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Tag: (props: Record<string, unknown>) => <svg data-testid="icon-tag" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

vi.mock('../../lib/utils', () => ({
  formatDiscount: vi.fn((amount: number, opts?: { decimals?: boolean }) =>
    opts?.decimals ? `${amount.toFixed(2)}` : `${amount}`
  ),
}));

import CouponBadge from './CouponBadge';

const defaultProps = {
  code: 'DESCONTO10',
  discountAmount: 10,
  onRemove: vi.fn(),
};

function renderBadge(overrides = {}) {
  return render(<CouponBadge {...defaultProps} {...overrides} />);
}

describe('CouponBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders code and discount in default variant', () => {
    renderBadge();
    expect(screen.getByText('DESCONTO10')).toBeTruthy();
    expect(screen.getByText('10.00')).toBeTruthy();
  });

  it('renders remove button text in default variant', () => {
    renderBadge();
    expect(screen.getByText('Remover')).toBeTruthy();
  });

  it('calls onRemove when clicking remove in default variant', () => {
    const onRemove = vi.fn();
    renderBadge({ onRemove });
    fireEvent.click(screen.getByText('Remover'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders in compact variant', () => {
    renderBadge({ variant: 'compact' });
    expect(screen.getByText('DESCONTO10')).toBeTruthy();
    expect(screen.getByText('10.00')).toBeTruthy();
  });

  it('hides discount in compact variant when discountAmount is 0', () => {
    renderBadge({ variant: 'compact', discountAmount: 0 });
    expect(screen.queryByText('0.00')).toBeNull();
  });

  it('shows discount in compact variant when discountAmount > 0', () => {
    renderBadge({ variant: 'compact', discountAmount: 25.5 });
    expect(screen.getByText('25.50')).toBeTruthy();
  });

  it('calls onRemove when clicking compact remove button', () => {
    const onRemove = vi.fn();
    renderBadge({ variant: 'compact', onRemove });
    fireEvent.click(screen.getByLabelText('Remover cupom'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('displays remove aria-label in both variants', () => {
    renderBadge();
    expect(screen.getAllByLabelText('Remover cupom').length).toBe(1);
  });

  it('compact variant has correct aria-label', () => {
    renderBadge({ variant: 'compact' });
    expect(screen.getByLabelText('Remover cupom')).toBeTruthy();
  });
});
