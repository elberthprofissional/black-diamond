// Re-export all utilities for backward compatibility
export { getBarberHours, getTimeSlotsForDate } from './slots';
export { maskPhone, formatPhone } from './phone';
export { getLocalDateString, formatDateBR, getNextDays, isTimeOccupied } from './dates';
export { getErrorMessage } from './errors';
export { maskName, maskEmail, formatDisplayName } from './masking';
export {
  formatPrice,
  formatDiscount,
  formatPriceAdmin,
  formatPricePublic,
  formatPriceWhatsApp,
} from './price';

// Re-export types
export type { NextDaysConfig } from './dates';
