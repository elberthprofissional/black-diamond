import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import type { Membership } from "../types";
import { Avatar } from "./ui/Avatar";
import { Icon } from "./ui/Icon";

interface HeaderProps {
  title: string;
  onMenu: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Administrador",
  owner: "Proprietário",
  barber: "Barbeiro",
};

export function Header({ title, onMenu }: HeaderProps) {
  const { profile, memberships, activeMembership, setActiveMembership, signOut } = useAuth();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/login");
  };

  const roleLabel = activeMembership
    ? ROLE_LABELS[activeMembership.role] ?? activeMembership.role
    : loginRoleLabel(profile);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="icon-btn icon-btn--menu" onClick={onMenu} aria-label="Abrir menu">
          <Icon name="menu" size={20} />
        </button>
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">
        {memberships.length > 1 ? (
          <select
            className="input select topbar__shop"
            value={activeMembership?.barbershop_id ?? ""}
            onChange={(e) => {
              const next = memberships.find((m: Membership) => m.barbershop_id === e.target.value);
              if (next) {
                setActiveMembership(next);
                showToast(`Alternado para ${next.barbershop_name}`, "info");
              }
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

        <div className="topbar__user">
          <Avatar name={profile?.full_name ?? "Usuário"} src={profile?.avatar_url} size="md" />
          <div className="topbar__user-block">
            <span className="topbar__username">{profile?.full_name ?? "Usuário"}</span>
            <span className="topbar__userrole">{roleLabel}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={handleSignOut}
            title="Sair"
            aria-label="Sair"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

function loginRoleLabel(profile: { is_superadmin?: boolean } | null): string {
  if (profile?.is_superadmin) return "Administrador";
  return "Acesso";
}