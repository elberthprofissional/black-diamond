import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton, {
  SkeletonCard,
  SkeletonList,
  SkeletonDashboard,
  SkeletonClients,
} from './Skeleton';

describe('Skeleton', () => {
  it('renderiza skeleton basico', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante circle', () => {
    render(<Skeleton variant="circle" width={40} height={40} />);
    const skeleton = document.querySelector('.rounded-full');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza variante rect', () => {
    render(<Skeleton variant="rect" />);
    const skeleton = document.querySelector('.rounded-xl');
    expect(skeleton).toBeInTheDocument();
  });

  it('renderiza com largura e altura customizadas', () => {
    render(<Skeleton width={100} height={50} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('renderiza card skeleton', () => {
    render(<SkeletonCard />);
    const cards = document.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('SkeletonList', () => {
  it('renderiza lista com 5 itens por padrao', () => {
    render(<SkeletonList />);
    const items = document.querySelectorAll('.flex.items-center.gap-4');
    expect(items.length).toBe(5);
  });

  it('renderiza lista com quantidade customizada', () => {
    render(<SkeletonList count={3} />);
    const items = document.querySelectorAll('.flex.items-center.gap-4');
    expect(items.length).toBe(3);
  });
});

describe('SkeletonDashboard', () => {
  it('renderiza dashboard skeleton', () => {
    render(<SkeletonDashboard />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonClients', () => {
  it('renderiza clients skeleton', () => {
    render(<SkeletonClients />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
