import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

/** Bloqueia acesso a rotas de cliente quando o app está em modo PWA standalone.
 *  Redireciona para /admin/login. */
const StandaloneGuard: FC<{ children: ReactNode }> = ({ children }) => {
  if (isStandalone) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default StandaloneGuard;
