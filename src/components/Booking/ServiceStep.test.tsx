import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceStep from './ServiceStep';
import type { Service } from '../../types';

const mockServices: Service[] = [
  { id: '1', name: 'Corte de Cabelo', price: 35, duration: 40 },
  { id: '2', name: 'Barba', price: 27, duration: 20 },
  { id: '3', name: 'Sobrancelha', price: 15, duration: 10 },
];

describe('ServiceStep', () => {
  const defaultProps = {
    services: mockServices,
    selectedServices: [],
    onToggle: vi.fn(),
    layout: 'desktop' as const,
  };

  it('renderiza todos os servicos', () => {
    render(<ServiceStep {...defaultProps} />);
    expect(screen.getByText('Corte de Cabelo')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('Sobrancelha')).toBeInTheDocument();
  });

  it('mostra precos corretamente', () => {
    render(<ServiceStep {...defaultProps} />);
    expect(screen.getByText('R$ 35')).toBeInTheDocument();
    expect(screen.getByText('R$ 27')).toBeInTheDocument();
    expect(screen.getByText('R$ 15')).toBeInTheDocument();
  });

  it('chama onToggle ao clicar em um servico', () => {
    const onToggle = vi.fn();
    render(<ServiceStep {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Corte de Cabelo'));
    expect(onToggle).toHaveBeenCalledWith(mockServices[0]);
  });

  it('mostra servico selecionado com estilo diferente', () => {
    render(<ServiceStep {...defaultProps} selectedServices={[mockServices[0]]} />);
    const serviceButton = screen.getByText('Corte de Cabelo').closest('button');
    expect(serviceButton).toHaveClass('bg-[#C5A059]/[0.06]');
  });

  it('renderiza no mobile', () => {
    render(<ServiceStep {...defaultProps} layout="mobile" />);
    expect(screen.getByText('Corte de Cabelo')).toBeInTheDocument();
  });

  it('mostra banner de mensalista', () => {
    render(<ServiceStep {...defaultProps} isMensalista={true} />);
    expect(screen.getByText(/Corte de Cabelo incluso/)).toBeInTheDocument();
  });

  it('mostra botao pular para mensalista', () => {
    const onSkip = vi.fn();
    render(<ServiceStep {...defaultProps} isMensalista={true} onSkip={onSkip} />);
    const skipButton = screen.getByText('Pular sem adicionar');
    fireEvent.click(skipButton);
    expect(onSkip).toHaveBeenCalled();
  });
});
