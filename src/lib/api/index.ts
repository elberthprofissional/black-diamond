export { getServices } from './services';
export type { Service } from '../../types';

export {
  createBooking,
  getAvailableSlots,
  getBookings,
  updateBookingStatus,
  deleteBooking,
  getBookingsByPhone,
  getLastBookingByPhone,
  cancelBooking,
  toggleSlotBlock,
  unblockDay,
  autoCompleteExpiredBookings,
  getBookingsForStats,
  deleteAllBookings,
  getBookingsByToken,
} from './bookings';
export type { ManagedBooking } from './bookings';

export {
  getClients,
  deleteAllClients,
  deleteClient,
  createClient,
  updateClient,
  updateClientNotes,
  toggleClientMensalista,
  getClientByPhone,
} from './clients';

export {
  getMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  getMensalistaEnabled,
  setMensalistaEnabled,
} from './mensalista';
export { getTemplates, createTemplate, deleteTemplate } from './templates';
export type { WhatsAppTemplate } from './templates';
export { getMaxNoShows, getClientNoShowCount, checkAndNotifyNoShowLimit } from './noShow';
export type { LoyaltyMilestone, MilestoneProgress } from '../../types';
export {
  getMilestones,
  saveMilestones,
  setLoyaltyEnabled,
  getClientMilestones,
  claimMilestone,
  incrementVisit,
  getClientMilestonesPublic,
} from './loyalty';
export {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
} from './coupons';

export {
  getActiveTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  syncGoogleReviews,
} from './testimonials';
