// Re-export all utilities for backward compatibility
export { getTimeSlotsForDate } from './utils/slots';
export { formatPhone } from './utils/phone';
export { getLocalDateString, formatDateBR, getNextDays, isTimeOccupied } from './utils/dates';
export { getErrorMessage } from './utils/errors';
export { formatDisplayName } from './utils/masking';
export {
  formatPrice,
  formatDiscount,
  formatPriceAdmin,
  formatPricePublic,
} from './utils/price';

// Re-export types
export type { NextDaysConfig } from './utils/dates';
