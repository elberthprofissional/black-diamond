import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { EffectiveRole, Membership, Profile } from "../types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  isSuperadmin: boolean;
  role: EffectiveRole | null;
  isLoading: boolean;
  setActiveMembership: (m: Membership) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVE_SHOP_KEY = "bd.active_barbershop_id";

async function loadMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase.rpc("get_my_memberships");
  if (error) return [];
  return (data ?? []) as Membership[];
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeMembership, setActive] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    setSession(current);
    if (!current?.user) {
      setProfile(null);
      setMemberships([]);
      setActive(null);
      setIsLoading(false);
      return;
    }

    const [profileRes, membershipsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_superadmin, created_at, updated_at")
        .eq("id", current.user.id)
        .maybeSingle(),
      loadMemberships(),
    ]);

    setProfile((profileRes.data as Profile | null) ?? null);
    setMemberships(membershipsRes);

    const saved = localStorage.getItem(ACTIVE_SHOP_KEY);
    const next =
      membershipsRes.find((m) => m.barbershop_id === saved) ??
      membershipsRes[0] ??
      null;
    setActive(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const isSuperadmin = Boolean(profile?.is_superadmin);

  const role: EffectiveRole | null = isSuperadmin
    ? "superadmin"
    : activeMembership?.role ?? null;

  const setActiveMembership = useCallback((m: Membership) => {
    localStorage.setItem(ACTIVE_SHOP_KEY, m.barbershop_id);
    setActive(m);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Limpa o estado local mesmo se a chamada à API falhar,
      // para o usuário nunca ficar preso numa sessão inválida.
    }
    setSession(null);
    setProfile(null);
    setMemberships([]);
    setActive(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        profile,
        memberships,
        activeMembership,
        isSuperadmin,
        role,
        isLoading,
        setActiveMembership,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}