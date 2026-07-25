import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsList from './SettingsList';

describe('SettingsList', () => {
  it('renderiza categorias de barbearia', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    expect(screen.getByText('Serviços')).toBeInTheDocument();
    expect(screen.getByText('Barbeiros')).toBeInTheDocument();
    expect(screen.getByText('Horários')).toBeInTheDocument();
    expect(screen.getByText('Controle de Faltas')).toBeInTheDocument();
    expect(screen.getByText('Fidelidade')).toBeInTheDocument();
    expect(screen.getByText('Cupons')).toBeInTheDocument();
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(screen.getByText('Depoimentos')).toBeInTheDocument();
  });

  it('chama onSelect ao clicar em uma categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Serviços'));
    expect(onSelect).toHaveBeenCalledWith('servicos');
  });

  it('chama onSelect com id correto para cada categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    const categories = [
      'servicos',
      'barbeiros',
      'horarios',
      'faltas',
      'fidelidade',
      'cupons',
      'galeria',
      'depoimentos',
    ];
    const labels: Record<string, string> = {
      servicos: 'Serviços',
      barbeiros: 'Barbeiros',
      horarios: 'Horários',
      faltas: 'Controle de Faltas',
      fidelidade: 'Fidelidade',
      cupons: 'Cupons',
      galeria: 'Galeria',
      depoimentos: 'Depoimentos',
    };

    categories.forEach((id) => {
      fireEvent.click(screen.getByText(labels[id]));
      expect(onSelect).toHaveBeenCalledWith(id);
    });
  });

  it('renderiza o grupo Barbearia', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    expect(screen.getByText('Barbearia')).toBeInTheDocument();
  });

  it('não renderiza categorias que estão no perfil', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    // These are on the main profile page, not in settings
    expect(screen.queryByText('Conta')).not.toBeInTheDocument();
    expect(screen.queryByText('Notificações')).not.toBeInTheDocument();
    expect(screen.queryByText('Zona de Segurança')).not.toBeInTheDocument();
    expect(screen.queryByText('Sair')).not.toBeInTheDocument();
  });
});
