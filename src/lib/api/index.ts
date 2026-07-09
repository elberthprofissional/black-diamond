export { getServices, createService, updateService, deleteService } from './services';

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
  completeAllActiveBookings,
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
  toggleClientFavorite,
  toggleClientMensalista,
  getClientByPhone,
} from './clients';

export {
  getMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  toggleMensalistaPlan,
  getMensalistaEnabled,
  setMensalistaEnabled,
} from './mensalista';
