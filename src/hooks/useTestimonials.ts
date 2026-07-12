import { useState, useEffect } from 'react';
import { getTestimonials } from '../lib/api';
import type { Testimonial } from '../types';

/** Hook público: busca depoimentos ativos do banco */
export function useTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTestimonials()
      .then((data) => {
        if (!cancelled) setTestimonials(data);
      })
      .catch(() => {
        // silently fail — section just won't show
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { testimonials, loading };
}
