export { getServices } from './services';

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

export {
  getActiveBarbers,
  getAllBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  getBarberStats,
} from './barbers';
