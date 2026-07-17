import { type FC, type ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function checkStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Bloqueia acesso a rotas de cliente quando o app está em modo PWA standalone.
 *  Redireciona para /admin/login. */
const StandaloneGuard: FC<{ children: ReactNode }> = ({ children }) => {
  const [isStandalone, setIsStandalone] = useState(checkStandalone);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = () => setIsStandalone(checkStandalone());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isStandalone) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default StandaloneGuard;
