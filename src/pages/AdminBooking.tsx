import { type FC } from 'react';
import { useAdminBookingState } from '../hooks/useAdminBookingState';
import { useIsDesktop } from '../hooks/useIsDesktop';
import AdminBookingDesktop from '../components/Admin/booking/AdminBookingDesktop';
import AdminBookingMobile from '../components/Admin/booking/AdminBookingMobile';

const AdminBooking: FC = () => {
  const booking = useAdminBookingState();
  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <AdminBookingDesktop booking={booking} />
  ) : (
    <AdminBookingMobile booking={booking} />
  );
};

export default AdminBooking;
