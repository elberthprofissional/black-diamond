import { supabase } from './supabase';

/** Cache for the place ID to avoid repeated DB queries */
let cachedPlaceId: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

/**
 * Fetches the Google Place ID from the settings table.
 * Caches the result for the session lifetime.
 * (Usado pelo ReviewRequestModal para abrir link de avaliação)
 */
export async function getGooglePlaceId(): Promise<string | null> {
  if (cachedPlaceId !== null) return cachedPlaceId;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'google_place_id')
        .maybeSingle();

      const placeId = data?.value || null;
      cachedPlaceId = placeId;
      return placeId;
    } catch {
      return null;
    }
  })();

  return fetchPromise;
}

/**
 * Generates a Google "Write a Review" URL for the given place ID.
 * (Usado pelo ReviewRequestModal) — apenas gera link, sem chamar API
 */
export function getGoogleReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/**
 * Calculates the average rating from a list of testimonials.
 */
export function calculateAverageRating(ratings: { rating: number; is_active: boolean }[]): number {
  const active = ratings.filter((r) => r.is_active);
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / active.length) * 10) / 10;
}
