/**
 * Centralized price formatting utilities for the Black Diamond app.
 * All price displays should use these functions for consistency.
 */

/**
 * Formats a price as Brazilian Real currency.
 * @param price - The price value
 * @param options - Formatting options
 * @returns Formatted price string (e.g., "R$ 45", "R$ 45,00", "R$ 1.250,00")
 */
export const formatPrice = (
  price: number | string | null | undefined,
  options?: {
    decimals?: boolean;
    compact?: boolean;
    locale?: boolean;
  }
): string => {
  const { decimals = false, compact = false, locale = false } = options ?? {};
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price ?? 0);

  if (isNaN(numPrice)) return 'R$ 0';

  if (locale) {
    // Use locale formatting for large numbers
    const formatted = numPrice.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    return `R$ ${formatted}`;
  }

  if (compact && numPrice >= 1000) {
    return `R$${(numPrice / 1000).toFixed(0)}k`;
  }

  if (decimals) {
    return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
  }

  return `R$ ${numPrice.toFixed(0)}`;
};

/**
 * Formats a price as a discount string.
 * @param discount - The discount amount
 * @returns Formatted discount string (e.g., "-R$ 10 OFF", "-R$ 10,00")
 */
export const formatDiscount = (
  discount: number | string | null | undefined,
  options?: { decimals?: boolean }
): string => {
  const { decimals = false } = options ?? {};
  const numDiscount = typeof discount === 'string' ? parseFloat(discount) : (discount ?? 0);

  if (isNaN(numDiscount) || numDiscount <= 0) return '';

  if (decimals) {
    return `-R$ ${numDiscount.toFixed(2).replace('.', ',')}`;
  }

  return `-R$ ${numDiscount.toFixed(0)} OFF`;
};

/**
 * Formats a price for display in admin panels (always with decimals).
 * @param price - The price value
 * @returns Formatted price string (e.g., "R$ 45,00")
 */
export const formatPriceAdmin = (price: number | string | null | undefined): string => {
  return formatPrice(price, { decimals: true });
};

/**
 * Formats a price for display in public-facing components (no decimals for whole numbers).
 * @param price - The price value
 * @returns Formatted price string (e.g., "R$ 45")
 */
export const formatPricePublic = (price: number | string | null | undefined): string => {
  return formatPrice(price, { decimals: false });
};

/**
 * Formats a price for WhatsApp messages.
 * @param price - The price value
 * @returns Formatted price string (e.g., "R$ 45,00")
 */
export const formatPriceWhatsApp = (price: number | string | null | undefined): string => {
  return formatPrice(price, { decimals: true, locale: true });
};
