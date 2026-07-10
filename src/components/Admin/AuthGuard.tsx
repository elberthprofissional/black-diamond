import { useEffect, useRef, useState, type ReactNode, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const redirect = () => {
      if (active && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        navigate('/admin/login', { replace: true });
      }
    };

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;

        if (!session) {
          redirect();
          return;
        }

        // Registrar Service Worker apenas para o Admin
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Erro ao registrar Service Worker do Admin:', err);
          });
        }

        setChecking(false);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          if (!session) {
            redirect();
          }
        });
        unsubscribe = subscription.unsubscribe;
      } catch {
        redirect();
      }
    };

    checkAuth();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
