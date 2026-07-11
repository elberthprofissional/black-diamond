import { supabase } from '../lib/supabase';
import { useAuditLog } from './useAuditLog';

export function useAdminLogout() {
  const { log } = useAuditLog();

  const logout = async () => {
    try {
      await log({ action: 'logout' });
    } catch {
      // Audit log failure shouldn't block logout
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // SignOut failure shouldn't block redirect
    }
    window.location.replace('/admin/login');
  };

  return logout;
}
