import { supabase } from '../lib/supabase';
import { useAuditLog } from './useAuditLog';

export function useAdminLogout() {
  const { log } = useAuditLog();

  const logout = async () => {
    await log({ action: 'logout' });
    await supabase.auth.signOut();
    window.location.replace('/admin/login');
  };

  return logout;
}
