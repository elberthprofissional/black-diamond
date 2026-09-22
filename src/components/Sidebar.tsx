import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { EffectiveRole } from "../types";
import { Avatar } from "./ui/Avatar";
import { Icon } from "./ui/Icon";
import type { IconName } from "./ui/Icon";
import { useAuth } from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  roles: EffectiveRole[];
}

interface SidebarProps {
  onNavigate?: () => void;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/admin/agenda", label: "Agenda", icon: "calendar", roles: ["superadmin", "owner", "barber"] },
      { to: "/admin/clientes", label: "Clientes", icon: "users", roles: ["superadmin", "owner", "barber"] },
      { to: "/admin/agendamentos", label: "Agendamentos", icon: "clock", roles: ["superadmin", "owner"] },
      { to: "/admin/financeiro", label: "Financeiro", icon: "card", roles: ["superadmin", "owner"] },
      { to: "/admin/bloqueios", label: "Bloqueios", icon: "ban", roles: ["barber"] },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/admin/perfil", label: "Perfil", icon: "user", roles: ["barber"] }],
  },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Administrador",
  owner: "Proprietário",
  barber: "Barbeiro",
};

/** Sidebar administrativa. */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { role, profile, memberships, activeMembership, setActiveMembership, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!role) return null;

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((i) => i.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
  const isSuper = role === "superadmin";
  const roleLabel = ROLE_LABELS[role] ?? role;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "sidebar__link" + (isActive ? " is-active" : "");

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
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/logo.webp" alt="BLACK DIAMOND" className="sidebar__logo" />
        <strong>
          BLACK <span className="sidebar__brand-gold">DIAMOND</span>
        </strong>
      </div>

      <nav className="sidebar__nav" aria-label="Menu principal">
        {groups.map((group) => (
          <div key={group.label} className="sidebar__group">
            <span className="sidebar__heading">{group.label}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={linkClass}
                onClick={onNavigate}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar__foot">
          {memberships.length > 1 ? (
            <select
              className="select sidebar__shop"
              value={activeMembership?.barbershop_id ?? ""}
              onChange={(e) => {
                const next = memberships.find((m) => m.barbershop_id === e.target.value);
                if (next) setActiveMembership(next);
              }}
              aria-label="Barbearia ativa"
            >
              {memberships.map((m) => (
                <option key={m.barbershop_id} value={m.barbershop_id}>
                  {m.barbershop_name}
                </option>
              ))}
            </select>
          ) : null}

          {isSuper ? (
            <NavLink to="/sistema" className={linkClass} onClick={onNavigate}>
              <Icon name="chart" size={17} />
              Sistema global
            </NavLink>
          ) : null}

          <div className="sidebar__user-menu" ref={menuRef}>
            <button
              type="button"
              className="sidebar__user-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={profile?.full_name ?? "Usuário"} src={profile?.avatar_url} size="sm" />
              <span className="sidebar__user-block">
                <span className="sidebar__username">{profile?.full_name ?? "Usuário"}</span>
                <span className="sidebar__userrole">{roleLabel}</span>
              </span>
              <Icon name="chevronRight" size={13} className="sidebar__user-caret" />
            </button>

            {menuOpen ? (
              <div className="sidebar__user-dropdown" role="menu">
                <button type="button" role="menuitem" className="sidebar__user-menu-item" onClick={openSettings}>
                  <Icon name="sliders" size={15} />
                  {settingsLabel}
                </button>
                <button type="button" role="menuitem" className="sidebar__user-menu-item is-danger" onClick={handleSignOut}>
                  <Icon name="logout" size={15} />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </aside>
  );
}