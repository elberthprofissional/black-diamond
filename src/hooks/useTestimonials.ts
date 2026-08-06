import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Testimonial } from '../types';
import * as api from '../lib/api/testimonials';

export const testimonialsQueryKey = ['testimonials'] as const;

interface UseTestimonialsReturn {
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  toggleActive: (id: string, currentActive: boolean) => Promise<void>;
  addTestimonial: (input: Pick<Testimonial, 'name' | 'rating' | 'text'>) => Promise<void>;
  deleteTestimonial: (id: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook para gerenciar depoimentos via React Query.
 *
 * - useQuery para carregar a lista
 * - useMutation para toggleActive, addTestimonial, deleteTestimonial
 * - Invalida cache automaticamente após mutações
 */
export function useTestimonials(): UseTestimonialsReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: testimonialsQueryKey,
    queryFn: api.getAllTestimonials,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation: toggle active status
  const toggleMutation = useMutation({
    mutationFn: ({ id, currentActive }: { id: string; currentActive: boolean }) =>
      api.updateTestimonial(id, { is_active: !currentActive }),
    onMutate: async ({ id, currentActive }) => {
      // Update otimista: inverte o status imediatamente
      await queryClient.cancelQueries({ queryKey: testimonialsQueryKey });
      const prev = queryClient.getQueryData<Testimonial[]>(testimonialsQueryKey);
      queryClient.setQueryData<Testimonial[]>(testimonialsQueryKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, is_active: !currentActive } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      // Rollback em caso de erro
      if (context?.prev) {
        queryClient.setQueryData(testimonialsQueryKey, context.prev);
      }
    },
  });

  // Mutation: add testimonial
  const addMutation = useMutation({
    mutationFn: (input: Pick<Testimonial, 'name' | 'rating' | 'text'>) =>
      api.createTestimonial(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Testimonial[]>(testimonialsQueryKey, (old) =>
        created ? [...(old || []), created] : old
      );
    },
  });

  // Mutation: delete testimonial
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTestimonial(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: testimonialsQueryKey });
      const prev = queryClient.getQueryData<Testimonial[]>(testimonialsQueryKey);
      queryClient.setQueryData<Testimonial[]>(testimonialsQueryKey, (old) =>
        old?.filter((t) => t.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(testimonialsQueryKey, context.prev);
      }
    },
  });

  return {
    testimonials: query.data ?? [],
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Erro ao carregar depoimentos'
      : null,
    toggleActive: async (id, currentActive) => {
      await toggleMutation.mutateAsync({ id, currentActive });
    },
    addTestimonial: async (input) => {
      await addMutation.mutateAsync(input);
    },
    deleteTestimonial: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: testimonialsQueryKey }),
  };
}
