import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const isPWA =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const PUBLIC_ROUTES = ['/', '/agendar'];
const ADMIN_ROUTES = [
  '/admin',
  '/admin/login',
  '/admin/clients',
  '/admin/weekly',
  '/admin/profile',
];

export default function PwaGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isPWA) return;

    // Redireciona de rotas públicas para login do admin
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      navigate('/admin/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Bloqueia navegação de voltar no PWA - mantém no admin
  useEffect(() => {
    if (!isPWA) return;

    const handlePopState = (e: PopStateEvent) => {
      // Se tentou voltar e não está em rota admin, força voltar pro admin
      if (!ADMIN_ROUTES.some((route) => location.pathname.startsWith(route))) {
        navigate('/admin/login', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  if (isPWA && PUBLIC_ROUTES.includes(location.pathname)) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
