import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function useAdminLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    if (window.matchMedia('(display-mode: standalone)').matches) {
      window.close();
      setTimeout(() => {
        navigate('/admin/login', { replace: true });
      }, 100);
    } else {
      navigate('/admin/login', { replace: true });
    }
  };

  return logout;
}
