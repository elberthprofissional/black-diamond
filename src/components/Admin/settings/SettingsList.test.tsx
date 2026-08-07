import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsList from './SettingsList';

describe('SettingsList', () => {
  it('renderiza categorias de barbearia para o dono', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner />);

    expect(screen.getByText('Serviços')).toBeInTheDocument();
    expect(screen.getByText('Horários')).toBeInTheDocument();
    expect(screen.getByText('Controle de Faltas')).toBeInTheDocument();
    expect(screen.getByText('Fidelidade')).toBeInTheDocument();
    expect(screen.getByText('Cupons')).toBeInTheDocument();
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(screen.getByText('Depoimentos')).toBeInTheDocument();
    expect(screen.getByText('Mensalista')).toBeInTheDocument();
  });

  it('barbeiro comum só vê Conta e Notificações (sem telas de negócio)', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner={false} />);

    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(screen.queryByText('Serviços')).not.toBeInTheDocument();
    expect(screen.queryByText('Cupons')).not.toBeInTheDocument();
    expect(screen.queryByText('Horários')).not.toBeInTheDocument();
    expect(screen.queryByText('Barbeiros')).not.toBeInTheDocument();
    expect(screen.queryByText('Fidelidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Mensalista')).not.toBeInTheDocument();
  });

  it('chama onSelect ao clicar em uma categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner />);

    fireEvent.click(screen.getByText('Serviços'));
    expect(onSelect).toHaveBeenCalledWith('servicos');
  });

  it('chama onSelect com id correto para cada categoria (dono)', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner />);

    const categories = [
      'servicos',
      'horarios',
      'faltas',
      'fidelidade',
      'cupons',
      'galeria',
      'depoimentos',
      'mensalista',
      'conta',
      'notificacoes',
    ];
    const labels: Record<string, string> = {
      servicos: 'Serviços',
      horarios: 'Horários',
      faltas: 'Controle de Faltas',
      fidelidade: 'Fidelidade',
      cupons: 'Cupons',
      galeria: 'Galeria',
      depoimentos: 'Depoimentos',
      mensalista: 'Mensalista',
      conta: 'Conta',
      notificacoes: 'Notificações',
    };

    categories.forEach((id) => {
      fireEvent.click(screen.getByText(labels[id]));
      expect(onSelect).toHaveBeenCalledWith(id);
    });
  });

  it('barbeiro comum pode navegar para Conta e Notificações', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner={false} />);

    fireEvent.click(screen.getByText('Conta'));
    expect(onSelect).toHaveBeenCalledWith('conta');
    fireEvent.click(screen.getByText('Notificações'));
    expect(onSelect).toHaveBeenCalledWith('notificacoes');
  });

  it('renderiza o grupo Barbearia', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner />);

    expect(screen.getByText('Barbearia')).toBeInTheDocument();
  });

  it('não renderiza Zona de Segurança na lista mobile', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} isOwner />);

    expect(screen.queryByText('Zona de Segurança')).not.toBeInTheDocument();
    expect(screen.queryByText('Sair')).not.toBeInTheDocument();
  });
});
