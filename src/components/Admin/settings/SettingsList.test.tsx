import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsList from './SettingsList';

describe('SettingsList', () => {
  it('renderiza todas as categorias', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(screen.getByText('Serviços')).toBeInTheDocument();
    expect(screen.getByText('Horários')).toBeInTheDocument();
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(screen.getByText('Zona de Segurança')).toBeInTheDocument();
  });

  it('chama onSelect ao clicar em uma categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Conta'));
    expect(onSelect).toHaveBeenCalledWith('conta');
  });

  it('chama onSelect com id correto para cada categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    const categories = ['conta', 'galeria', 'servicos', 'horarios', 'notificacoes', 'dados'];
    categories.forEach((id) => {
      fireEvent.click(
        screen.getByText(
          id === 'conta'
            ? 'Conta'
            : id === 'galeria'
              ? 'Galeria'
              : id === 'servicos'
                ? 'Serviços'
                : id === 'horarios'
                  ? 'Horários'
                  : id === 'notificacoes'
                    ? 'Notificações'
                    : 'Zona de Segurança'
        )
      );
      expect(onSelect).toHaveBeenCalledWith(id);
    });
  });

  it('renderiza descriptions de cada categoria', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    expect(screen.getByText('Gerencie suas informações pessoais')).toBeInTheDocument();
    expect(screen.getByText('Gerencie as fotos exibidas aos clientes')).toBeInTheDocument();
    expect(screen.getByText('Gerencie os serviços oferecidos')).toBeInTheDocument();
    expect(screen.getByText('Configure seus dias e horários de atendimento')).toBeInTheDocument();
    expect(screen.getByText('Receba alertas de novos agendamentos')).toBeInTheDocument();
    expect(screen.getByText('Excluir permanentemente os dados')).toBeInTheDocument();
  });

  it('_categoria de dados tem estilo danger', () => {
    const onSelect = vi.fn();
    render(<SettingsList onSelect={onSelect} />);

    const dangerButton = screen.getByText('Zona de Segurança').closest('button');
    expect(dangerButton).toBeInTheDocument();
  });
});
