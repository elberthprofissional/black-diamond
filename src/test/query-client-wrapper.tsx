import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Cria um QueryClient isolado para testes unitários.
 * - retry: false para evitar timeouts
 * - gcTime: 0 para evitar memory leaks entre testes
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

/**
 * Cria um wrapper React Query para usar com renderHook em testes.
 * Uso:
 *   renderHook(() => useHook(), { wrapper: queryClientWrapper() });
 */
export function queryClientWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/**
 * Cria um wrapper + queryClient compartilhado para testar cache entre renders.
 * Uso:
 *   const { wrapper, queryClient } = createSharedWrapper();
 *   renderHook(() => useHook(), { wrapper });
 */
export function createSharedWrapper() {
  const queryClient = createTestQueryClient();

  return {
    wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    },
    queryClient,
  };
}
