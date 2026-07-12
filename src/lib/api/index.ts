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
export { getMaxNoShows, isClientNoShowBlocked, checkPhoneNoShowBlock } from './noShow';
export type { LoyaltyMilestone, MilestoneProgress } from '../../types';
export {
  getMilestones,
  saveMilestones,
  setLoyaltyEnabled,
  getClientMilestones,
  claimMilestone,
  incrementVisit,
  getClaimedCount,
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
  getTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  countTestimonials,
  MAX_TESTIMONIALS,
} from './testimonials';
