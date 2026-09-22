import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Calendar,
  ChevronDown,
  ClipboardList,
  Globe,
  LogOut,
  Settings,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import type { EffectiveRole } from "../types";
import { Avatar } from "./ui/Avatar";
import { useAuth } from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: EffectiveRole[];
}

interface SidebarProps {
  onNavigate?: () => void;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/admin/agenda", label: "Agenda", icon: Calendar, roles: ["superadmin", "owner", "barber"] },
      { to: "/admin/clientes", label: "Clientes", icon: Users, roles: ["superadmin", "owner", "barber"] },
      { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList, roles: ["superadmin", "owner"] },
      { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, roles: ["superadmin", "owner"] },
      { to: "/admin/bloqueios", label: "Bloqueios", icon: Ban, roles: ["barber"] },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/admin/perfil", label: "Perfil", icon: UserRound, roles: ["barber"] }],
  },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Administrador",
  owner: "Proprietário",
  barber: "Barbeiro",
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  "flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none " +
  (isActive
    ? "bg-white/10 text-foreground font-medium"
    : "text-muted-foreground hover:bg-white/5 hover:text-foreground/90");

const iconClass = (isActive: boolean) =>
  "w-[16px] h-[16px] transition-colors shrink-0 " +
  (isActive ? "text-primary" : "text-muted-foreground/70");

/** Sidebar administrativa. */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { role, profile, memberships, activeMembership, setActiveMembership, signOut } = useAuth();
  const navigate = useNavigate();
  const [wsOpen, setWsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!role) return null;

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((i) => i.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
  const isSuper = role === "superadmin";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const wsName = activeMembership?.barbershop_name ?? (isSuper ? "Sistema Global" : "Barbearia");

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      window.location.assign("/login");
    }
  };

  const settingsTo = role === "barber" ? "/admin/perfil" : "/admin/configuracao";
  const settingsLabel = role === "barber" ? "Meu perfil" : "Configurações";

  const openSettings = () => {
    setMenuOpen(false);
    onNavigate?.();
    navigate(settingsTo);
  };

  return (
    <aside className="sidebar p-3">
      {/* Workspace switcher (barbearia ativa) */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center justify-between w-full px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none group"
          onClick={() => setWsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={wsOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.webp"
              alt="BLACK DIAMOND"
              className="w-8 h-8 rounded-[6px] object-contain shrink-0 bg-card shadow-sm"
            />
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-[13px] font-medium leading-tight text-foreground truncate max-w-[140px]">
                {wsName}
              </span>
            </div>
          </div>
          <ChevronDown
            className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0"
            strokeWidth={1.5}
          />
        </button>

        {wsOpen && memberships.length > 1 ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setWsOpen(false)} />
            <div className="absolute top-[52px] left-0 w-full bg-card border border-border/50 rounded-lg shadow-xl z-50 py-1 flex flex-col gap-0.5">
              {memberships.map((m) => (
                <button
                  key={m.barbershop_id}
                  type="button"
                  onClick={() => {
                    setActiveMembership(m);
                    setWsOpen(false);
                    onNavigate?.();
                  }}
                  className={`px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors text-left ${
                    m.barbershop_id === activeMembership?.barbershop_id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-white/5"
                  }`}
                >
                  {m.barbershop_name}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col gap-4 mt-4 mb-2">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end className={linkClass} onClick={onNavigate}>
                {({ isActive }) => (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon className={iconClass(isActive)} strokeWidth={1.5} />
                    <span className="text-[13px] tracking-wide truncate">{item.label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-0.5">
        {isSuper ? (
          <NavLink to="/sistema" end className={linkClass} onClick={onNavigate}>
            {({ isActive }) => (
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe className={iconClass(isActive)} strokeWidth={1.5} />
                <span className="text-[13px] tracking-wide truncate">Sistema global</span>
              </div>
            )}
          </NavLink>
        ) : null}

        <div className="relative">
          <button
            type="button"
            className="flex items-center justify-between w-full px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none group"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={profile?.full_name ?? "Usuário"} src={profile?.avatar_url} size="sm" />
              <span className="flex flex-col overflow-hidden text-left">
                <span className="text-[13px] font-medium leading-none mb-1 text-foreground truncate max-w-[150px]">
                  {profile?.full_name ?? "Usuário"}
                </span>
                <span className="text-[11px] text-muted-foreground leading-none truncate">
                  {roleLabel}
                </span>
              </span>
            </div>
            <ChevronDown
              className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors shrink-0"
              strokeWidth={1.5}
            />
          </button>

          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-[52px] left-0 w-full bg-card border border-border/50 rounded-lg shadow-xl z-50 py-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  className="px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors flex items-center gap-2 text-foreground/80 hover:bg-white/5"
                  onClick={openSettings}
                >
                  <Settings className="w-[15px] h-[15px] text-muted-foreground/70 shrink-0" strokeWidth={1.5} />
                  {settingsLabel}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-[15px] h-[15px] shrink-0" strokeWidth={1.5} />
                  Sair
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}