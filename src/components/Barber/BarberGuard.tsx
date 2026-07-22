import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useBarberContext } from '../../contexts/BarberContext';

interface BarberGuardProps {
  children: ReactNode;
}

/**
 * BarberGuard - Ensures only barber employees (non-owners) can access the barber route.
 * Owners are redirected to /admin.
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

  // If no barber is set (shouldn't happen if authenticated), redirect to login
  if (!currentBarber) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default BarberGuard;
