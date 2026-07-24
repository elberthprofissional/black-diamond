import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

const { MotionEl } = vi.hoisted(() => {
  const FM_PROPS = new Set([
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
  return {
    MotionEl:
      (tag: string) =>
      ({ children, ...props }: Record<string, unknown>) => {
        const safe = Object.fromEntries(Object.entries(props).filter(([k]) => !FM_PROPS.has(k)));
        return createElement(tag, safe, children as ReactNode);
      },
  };
});

vi.mock('framer-motion', () => ({
  motion: { div: MotionEl('div'), button: MotionEl('button'), p: MotionEl('p') },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: (props: Record<string, unknown>) =>
    createElement('svg', { 'data-testid': 'icon-arrow-left', ...props }),
  ChevronDown: (props: Record<string, unknown>) =>
    createElement('svg', { 'data-testid': 'icon-chevron-down', ...props }),
  Trash2: (props: Record<string, unknown>) =>
    createElement('svg', { 'data-testid': 'icon-trash', ...props }),
  X: (props: Record<string, unknown>) =>
    createElement('svg', { 'data-testid': 'icon-x', ...props }),
}));

import ReminderModal from './ReminderModal';
import type { WhatsAppTemplate } from '../../../lib/api';

const mockTemplates: WhatsAppTemplate[] = [
  {
    id: 't1',
    key: 'k1',
    name: 'Lembrete 24h',
    body: 'Olá! Lembrete do agendamento.',
    created_at: '',
    updated_at: '',
  },
  { id: 't2', key: 'k2', name: '', body: 'Confirme seu horário.', created_at: '', updated_at: '' },
];

const defaultProps = {
  isOpen: true,
  clientName: 'João Silva',
  templates: mockTemplates,
  onDeleteTemplate: vi.fn(),
  onSaveTemplate: vi.fn(),
  onSendTemplate: vi.fn(),
  onClose: vi.fn(),
};

function renderModal(overrides = {}) {
  return render(<ReminderModal {...defaultProps} {...overrides} />);
}

describe('ReminderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    renderModal();
    expect(screen.getByText('Enviar Lembrete')).toBeTruthy();
    expect(screen.getByText('João Silva')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Enviar Lembrete')).toBeNull();
  });

  it('displays templates list', () => {
    renderModal();
    expect(screen.getByText('Lembrete 24h')).toBeTruthy();
    expect(screen.getByText('Olá! Lembrete do agendamento.')).toBeTruthy();
    expect(screen.getByText('Confirme seu horário.')).toBeTruthy();
  });

  it('shows unnamed template as "Modelo #2"', () => {
    renderModal();
    expect(screen.getByText('Modelo #2')).toBeTruthy();
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText('Fechar lembrete'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const backdrop = document.querySelector('.bg-black\\/75') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('expands template on click', () => {
    renderModal();
    const template = screen.getByLabelText('Modelo 1');
    fireEvent.click(template);
    expect(screen.getByText('Excluir')).toBeTruthy();
    expect(screen.getByText('Enviar')).toBeTruthy();
  });

  it('collapses template on second click', () => {
    renderModal();
    const template = screen.getByLabelText('Modelo 1');
    fireEvent.click(template);
    fireEvent.click(template);
    expect(screen.queryByText('Excluir')).toBeNull();
  });

  it('calls onDeleteTemplate when clicking delete on expanded template', () => {
    const onDeleteTemplate = vi.fn();
    renderModal({ onDeleteTemplate });
    fireEvent.click(screen.getByLabelText('Modelo 1'));
    fireEvent.click(screen.getByText('Excluir'));
    expect(onDeleteTemplate).toHaveBeenCalledWith('t1');
  });

  it('calls onSendTemplate when clicking send on expanded template', () => {
    const onSendTemplate = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSendTemplate, onClose });
    fireEvent.click(screen.getByLabelText('Modelo 1'));
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSendTemplate).toHaveBeenCalledWith('Olá! Lembrete do agendamento.');
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to create mode', () => {
    renderModal();
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    expect(screen.getAllByText('Mensagem Personalizada').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Mensagem personalizada de lembrete')).toBeTruthy();
  });

  it('navigates back from create mode', () => {
    renderModal();
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    fireEvent.click(screen.getByLabelText('Voltar para lista de modelos'));
    expect(screen.getByText('Enviar Lembrete')).toBeTruthy();
  });

  it('saves template and stays in create mode', () => {
    const onSaveTemplate = vi.fn();
    renderModal({ onSaveTemplate });
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    const textarea = screen.getByLabelText('Mensagem personalizada de lembrete');
    fireEvent.change(textarea, { target: { value: 'Nova mensagem' } });
    fireEvent.click(screen.getByText('Salvar nos Modelos'));
    expect(onSaveTemplate).toHaveBeenCalledWith('Nova mensagem');
    // Should stay in create mode
    expect(screen.getByLabelText('Mensagem personalizada de lembrete')).toBeTruthy();
  });

  it('does not save empty template', () => {
    const onSaveTemplate = vi.fn();
    renderModal({ onSaveTemplate });
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    const saveBtn = screen.getByText('Salvar nos Modelos').closest('button');
    expect(saveBtn).toHaveProperty('disabled', true);
    fireEvent.click(saveBtn);
    expect(onSaveTemplate).not.toHaveBeenCalled();
  });

  it('sends custom message', () => {
    const onSendTemplate = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSendTemplate, onClose });
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    const textarea = screen.getByLabelText('Mensagem personalizada de lembrete');
    fireEvent.change(textarea, { target: { value: 'Mensagem customizada' } });
    fireEvent.click(screen.getByText('Enviar no WhatsApp'));
    expect(onSendTemplate).toHaveBeenCalledWith('Mensagem customizada');
    expect(onClose).toHaveBeenCalled();
  });

  it('inserts link into custom message', () => {
    renderModal();
    fireEvent.click(screen.getByText('+ Criar Lembrete'));
    fireEvent.click(screen.getByText('Inserir link do site'));
    const textarea = screen.getByLabelText(
      'Mensagem personalizada de lembrete'
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain('/agendar');
  });

  it('shows empty template list with no templates', () => {
    renderModal({ templates: [] });
    expect(screen.getByText('+ Criar Lembrete')).toBeTruthy();
  });
});
