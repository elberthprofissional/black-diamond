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
  X: (props: Record<string, unknown>) =>
    createElement('svg', { 'data-testid': 'icon-x', ...props }),
}));

vi.mock('../../../lib/utils', () => ({
  formatPhone: vi.fn((v: string) => v),
}));

import NewClientModal from './NewClientModal';

const defaultProps = {
  isOpen: true,
  name: '',
  phone: '',
  notes: '',
  saving: false,
  error: '',
  onNameChange: vi.fn(),
  onPhoneChange: vi.fn(),
  onNotesChange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

function renderModal(overrides = {}) {
  return render(<NewClientModal {...defaultProps} {...overrides} />);
}

describe('NewClientModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Novo cliente')).toBeTruthy();
  });

  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays form fields', () => {
    renderModal();
    expect(screen.getByLabelText('Nome do cliente')).toBeTruthy();
    expect(screen.getByLabelText('WhatsApp do cliente')).toBeTruthy();
    expect(screen.getByLabelText('Anotações do cliente')).toBeTruthy();
  });

  it('calls onNameChange with uppercased value', () => {
    const onNameChange = vi.fn();
    renderModal({ onNameChange });
    fireEvent.change(screen.getByLabelText('Nome do cliente'), { target: { value: 'joão' } });
    expect(onNameChange).toHaveBeenCalledWith('JOÃO');
  });

  it('calls onPhoneChange with formatted value', () => {
    const onPhoneChange = vi.fn();
    renderModal({ onPhoneChange });
    fireEvent.change(screen.getByLabelText('WhatsApp do cliente'), {
      target: { value: '31999999999' },
    });
    expect(onPhoneChange).toHaveBeenCalled();
  });

  it('calls onNotesChange', () => {
    const onNotesChange = vi.fn();
    renderModal({ onNotesChange });
    fireEvent.change(screen.getByLabelText('Anotações do cliente'), { target: { value: 'Teste' } });
    expect(onNotesChange).toHaveBeenCalledWith('Teste');
  });

  it('calls onSave when clicking save button', () => {
    const onSave = vi.fn();
    renderModal({ onSave, name: 'João', phone: '31999999999' });
    fireEvent.click(screen.getByText('Salvar'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking cancel button', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking close icon', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables save when name is empty', () => {
    renderModal({ name: '', phone: '31999999999' });
    const saveBtn = screen.getByText('Salvar').closest('button');
    expect(saveBtn).toHaveProperty('disabled', true);
  });

  it('disables save when phone is empty', () => {
    renderModal({ name: 'João', phone: '' });
    const saveBtn = screen.getByText('Salvar').closest('button');
    expect(saveBtn).toHaveProperty('disabled', true);
  });

  it('shows "..." when saving', () => {
    renderModal({ saving: true, name: 'João', phone: '31999999999' });
    expect(screen.getByText('...')).toBeTruthy();
  });

  it('displays error message when error is present', () => {
    renderModal({ error: 'Nome já existe' });
    expect(screen.getByText('Nome já existe')).toBeTruthy();
  });

  it('does not display error when error is empty', () => {
    renderModal({ error: '' });
    expect(screen.queryByText('Nome já existe')).toBeNull();
  });
});
