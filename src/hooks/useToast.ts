import { useState, useEffect, useCallback } from 'react';

export interface Toast {
  message: string;
  type: 'success' | 'error';
}

/**
 * Hook para gerenciar notificações toast (pequenas mensagens temporárias).
 *
 * - `showSuccess(msg)`: toast verde de sucesso
 * - `showError(msg)`: toast vermelho de erro
 * - O toast desaparece automaticamente após `duration` ms (padrão 3000ms).
 *
 * @param duration - Duração em ms antes do toast desaparecer.
 * @returns {{ toast, showToast, showSuccess, showError }}
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);

  return { toast, showToast, showSuccess, showError };
}
