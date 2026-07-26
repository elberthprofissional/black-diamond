import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useBarberContext } from '../../contexts/BarberContext';

interface BarberGuardProps {
  children: ReactNode;
}

/**
 * BarberGuard - Ensures only barber employees (non-owners) can access the barber route.
 * Owners are redirected to /admin.
 * Authenticated users without a barber record are redirected to /admin (not login).
 */
const BarberGuard: FC<BarberGuardProps> = ({ children }) => {
  const { currentBarber, loading, isOwner } = useBarberContext();

  if (loading) {
    return null;
  }

  // If user is the owner, redirect to admin dashboard
  if (isOwner) {
    return <Navigate to="/admin" replace />;
  }

  // If no barber is set but user is authenticated, send to admin (not login)
  // This prevents a redirect loop when admin_users exist but haven't been
  // migrated to the barbers table yet
  if (!currentBarber) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default BarberGuard;
