import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (active) {
          if (!session) {
            navigate('/admin/login', { replace: true });
          } else {
            setChecking(false);
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) {
            if (!session) {
              navigate('/admin/login', { replace: true });
            } else {
              setChecking(false);
            }
          }
        });
        unsubscribe = subscription.unsubscribe;
      } catch {
        if (active) navigate('/admin/login', { replace: true });
      }
    };
    
    checkAuth();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
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

