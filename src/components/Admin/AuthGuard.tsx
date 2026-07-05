import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (!session) {
          redirect();
          return;
        }

        setChecking(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
