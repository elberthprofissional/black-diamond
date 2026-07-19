// Re-export all utilities for backward compatibility
export { getBarberHours, getTimeSlotsForDate } from './utils/slots';
export { maskPhone, formatPhone } from './utils/phone';
export { getLocalDateString, formatDateBR, getNextDays, isTimeOccupied } from './utils/dates';
export { getErrorMessage } from './utils/errors';
export { maskName, maskEmail, formatDisplayName } from './utils/masking';
export {
  formatPrice,
  formatDiscount,
  formatPriceAdmin,
  formatPricePublic,
  formatPriceWhatsApp,
} from './utils/price';

// Re-export types
export type { NextDaysConfig } from './utils/dates';
