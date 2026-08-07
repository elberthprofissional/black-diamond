import { useEffect, useRef, useState, type ReactNode, type FC } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { logError } from '../../lib/logger';

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

    // Bloqueia não-admins e erros de verificação (fail-closed): desloga e
    // redireciona. O signOut é essencial — sem ele, a tela de login veria a
    // sessão ativa e devolveria o usuário ao /admin (loop de redirect).
    const rejectAccess = async () => {
      if (!active) return;
      await supabase.auth.signOut().catch(() => {});
      redirect();
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

        // Valida que o usuário autenticado é realmente admin (admin_users).
        // A RPC is_admin() é SECURITY DEFINER (migration 001) e ganhou
        // GRANT EXECUTE explícito na migration 008.
        const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
        if (!active) return;

        if (adminError || !isAdmin) {
          await rejectAccess();
          return;
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
      } catch (e) {
        logError(e);
        await rejectAccess();
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
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
