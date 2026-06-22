import { supabase } from '../lib/supabase';

export function useAdminLogout() {
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/admin/login');
  };

  return logout;
}
