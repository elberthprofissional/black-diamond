import { supabase } from '../lib/supabase';

export function useAdminLogout() {
  const logout = async () => {
    await supabase.auth.signOut();
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as unknown as { standalone?: boolean }).standalone;
                  
    if (isPWA) {
      window.location.replace('/admin/login');
    } else {
      window.location.replace('/');
    }
  };

  return logout;
}
