import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

export function useAdminLogout() {
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logError(e);
      // SignOut failure shouldn't block redirect
    }
    window.location.replace('/admin/login');
  };

  return logout;
}
