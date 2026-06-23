import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone === true ||
             localStorage.getItem('barber_pwa_installed') === 'true';

const PUBLIC_ROUTES = ['/', '/agendar'];

export default function PwaGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isPWA) return;

    if (PUBLIC_ROUTES.includes(location.pathname)) {
      navigate('/admin/login', { replace: true });
    }
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
