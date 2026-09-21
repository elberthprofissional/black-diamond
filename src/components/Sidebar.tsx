import { NavLink } from "react-router-dom";
import type { EffectiveRole } from "../types";
import { Icon } from "./ui/Icon";
import type { IconName } from "./ui/Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  roles: EffectiveRole[];
}

interface SidebarProps {
  role: EffectiveRole | null;
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
    items: [
      { to: "/admin/configuracao", label: "Configurações", icon: "sliders", roles: ["superadmin", "owner"] },
      { to: "/admin/perfil", label: "Perfil", icon: "user", roles: ["barber"] },
    ],
  },
];

/** Sidebar administrativa. */
export function Sidebar({ role, onNavigate }: SidebarProps) {
  if (!role) return null;

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((i) => i.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
  const isSuper = role === "superadmin";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "sidebar__link" + (isActive ? " is-active" : "");

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/logo.webp" alt="BLACK DIAMOND" className="sidebar__logo" />
        <strong>BLACK DIAMOND</strong>
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

        {isSuper ? (
          <div className="sidebar__foot">
            <NavLink to="/sistema" className={linkClass} onClick={onNavigate}>
              <Icon name="chart" size={17} />
              Sistema global
            </NavLink>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}