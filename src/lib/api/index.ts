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
  getBookingsForStats,
  deleteAllBookings,
  getBookingsByToken,
  completarAgendamentosExpirados,
  getExpiredConfirmedBookingsCount,
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
  registerPublicClient,
  getClientDashboard,
} from './clients';

export {
  resolverLoginProfissional,
  buscarClientesPorNome,
  verificarSenhaCliente,
  criarSenhaCliente,
  verificarLoginCliente,
  criarContaCliente,
  solicitarRecuperacaoCliente,
  redefinirSenhaCliente,
  atualizarEmailCliente,
  alterarSenhaCliente,
  limparSenhaClienteAdmin,
} from './clientAuth';
export type {
  ResolverResult,
  ResolvedProfessional,
  ClientMatch,
  ClientPasswordStatus,
} from './clientAuth';

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
  getAvailableCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  resgatarCupom,
  getClientCoupons,
  usarCupomResgatado,
} from './coupons';

export {
  getActiveTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from './testimonials';

export {
  getMensalistaPlans,
  getAllMensalistaPlans,
  createMensalistaPlan,
  updateMensalistaPlan,
  deleteMensalistaPlan,
  getMensalistaPlanName,
  getMensalistaPlanServices,
} from './mensalista';

export { getBarbers, getBarberByUserId, upsertBarber, deleteBarber } from './barbers';
export type { Barber } from '../../types';
