import { useState, useEffect, useCallback } from 'react';
import type { Testimonial } from '../types';
import * as api from '../lib/api/testimonials';

interface UseTestimonialsReturn {
  testimonials: Testimonial[];
  loading: boolean;
  error: string | null;
  toggleActive: (id: string, currentActive: boolean) => Promise<void>;
  addTestimonial: (input: Pick<Testimonial, 'name' | 'rating' | 'text'>) => Promise<void>;
  deleteTestimonial: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTestimonials(): UseTestimonialsReturn {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTestimonials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllTestimonials();
      setTestimonials(data);
    } catch (e) {
      setError('Erro ao carregar depoimentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  const toggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await api.updateTestimonial(id, { is_active: !currentActive });
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !currentActive } : t))
      );
    } catch {
      setError('Erro ao atualizar depoimento');
    }
  }, []);

  const addTestimonial = useCallback(
    async (input: Pick<Testimonial, 'name' | 'rating' | 'text'>) => {
      const created = await api.createTestimonial(input);
      setTestimonials((prev) => [...prev, created]);
    },
    []
  );

  const deleteTestimonial = useCallback(async (id: string) => {
    try {
      await api.deleteTestimonial(id);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Erro ao deletar depoimento');
    }
  }, []);

  return {
    testimonials,
    loading,
    error,
    toggleActive,
    addTestimonial,
    deleteTestimonial,
    refresh: loadTestimonials,
  };
}
