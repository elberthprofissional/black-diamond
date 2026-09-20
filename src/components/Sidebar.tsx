import { NavLink } from "react-router-dom";
import type { EffectiveRole, Membership } from "../types";
import { Icon } from "./ui/Icon";
import type { IconName } from "./ui/Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  roles: EffectiveRole[];
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Visão geral", icon: "home", roles: ["superadmin", "owner", "barber"] },
  { to: "/admin/agenda", label: "Agenda", icon: "calendar", roles: ["superadmin", "owner", "barber"] },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: "clock", roles: ["superadmin", "owner"] },
  { to: "/admin/clientes", label: "Clientes", icon: "users", roles: ["superadmin", "owner", "barber"] },
  { to: "/admin/servicos", label: "Serviços", icon: "scissors", roles: ["superadmin", "owner"] },
  { to: "/admin/equipe", label: "Equipe", icon: "user", roles: ["superadmin", "owner"] },
  { to: "/admin/galeria", label: "Galeria", icon: "camera", roles: ["superadmin", "owner"] },
  { to: "/admin/cupons", label: "Cupons", icon: "percent", roles: ["superadmin", "owner"] },
  { to: "/admin/cupons", label: "Cupons", icon: "percent", roles: ["superadmin", "owner"] },
  { to: "/admin/bloqueios", label: "Bloqueios", icon: "ban", roles: ["superadmin", "owner", "barber"] },
  { to: "/admin/financeiro", label: "Financeiro", icon: "card", roles: ["superadmin", "owner"] },
  { to: "/admin/perfil", label: "Meu perfil", icon: "user", roles: ["superadmin", "owner", "barber"] },
  { to: "/admin/configuracao", label: "Configuração", icon: "sliders", roles: ["superadmin", "owner"] },
];

interface SidebarProps {
  role: EffectiveRole | null;
  shop: Membership | null;
  onNavigate?: () => void;
}

export function Sidebar({ role, shop, onNavigate }: SidebarProps) {
  const items = NAV.filter((i) => role && i.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">◆</span>
        <div>
          <strong>BLACK DIAMOND</strong>
          <span className="sidebar__system">Sistema de barbearia</span>
        </div>
      </div>

      {shop ? (
        <div className="sidebar__shop" title={shop.barbershop_name}>
          <span className="sidebar__shop-name">{shop.barbershop_name}</span>
          <span className="badge badge--ghost">{shop.role}</span>
        </div>
      ) : null}

      <nav className="sidebar__nav" aria-label="Menu principal">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) => `sidebar__link ${isActive ? "is-active" : ""}`}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={17} />
            {item.label}
          </NavLink>
        ))}

        {role === "superadmin" ? (
          <NavLink
            to="/sistema"
            className={({ isActive }) => `sidebar__link ${isActive ? "is-active" : ""}`}
            onClick={onNavigate}
          >
            <Icon name="chart" size={17} />
            Sistema global
          </NavLink>
        ) : null}
      </nav>
    </aside>
  );
}