import { supabase } from '../lib/supabase';
import { useAuditLog } from './useAuditLog';
import { logError } from '../lib/logger';

export function useAdminLogout() {
  const { log } = useAuditLog();

  const logout = async () => {
    try {
      await log({ action: 'logout' });
    } catch (e) {
      logError(e);
      // Audit log failure shouldn't block logout
    }
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
