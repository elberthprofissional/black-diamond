import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingSlidePanel from './BookingSlidePanel';

// Mock framer-motion to avoid animation side effects in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      // Strip out framer-motion-specific props that React DOM doesn't understand
      const validProps: Record<string, unknown> = {};
      const skip = new Set(['initial', 'animate', 'exit', 'transition', 'variants']);
      for (const [k, v] of Object.entries(props)) {
        if (!skip.has(k)) validProps[k] = v;
      }
      return <div {...validProps}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('BookingSlidePanel', () => {
  const defaultProps = {
    isOpen: true,
    isDesktop: true,
    onClose: vi.fn(),
    children: <div data-testid="panel-content">Conteúdo do painel</div>,
  };

  it('renderiza conteúdo quando isOpen é true', () => {
    render(<BookingSlidePanel {...defaultProps} />);
    expect(screen.getByTestId('panel-content')).toBeTruthy();
    expect(screen.getByText('Conteúdo do painel')).toBeTruthy();
  });

  it('não renderiza quando isOpen é false', () => {
    render(<BookingSlidePanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('panel-content')).toBeNull();
  });

  it('chama onClose ao clicar no backdrop', async () => {
    const onClose = vi.fn();
    const { container } = render(<BookingSlidePanel {...defaultProps} onClose={onClose} />);

    // Find backdrop: it's the div with "absolute" position (not "fixed")
    const allDivs = container.querySelectorAll('div');
    const backdrop = Array.from(allDivs).find(
      (el) => el.className.includes('absolute') && el.className.includes('inset-0')
    );
    expect(backdrop).toBeTruthy();
    await userEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renderiza com posicionamento correto no desktop', () => {
    const { container } = render(<BookingSlidePanel {...defaultProps} isDesktop={true} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('justify-end');
    expect(outerDiv.className).toContain('flex');
  });

  it('renderiza com posicionamento correto no mobile', () => {
    const { container } = render(<BookingSlidePanel {...defaultProps} isDesktop={false} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('flex-col');
    expect(outerDiv.className).toContain('justify-end');
  });

  it('renderiza com z-index 200', () => {
    const { container } = render(<BookingSlidePanel {...defaultProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('z-[200]');
  });

  it('todas as funções do painel estão acessíveis', () => {
    const onClose = vi.fn();
    render(<BookingSlidePanel {...defaultProps} onClose={onClose} />);

    expect(screen.getByTestId('panel-content')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
