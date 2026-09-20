import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { useAuth } from "../hooks/useAuth";

const TITLES: Record<string, string> = {
  "/admin": "Visão geral",
  "/admin/agenda": "Agenda",
  "/admin/agendamentos": "Agendamentos",
  "/admin/clientes": "Clientes",
  "/admin/servicos": "Serviços",
  "/admin/equipe": "Equipe",
  "/admin/galeria": "Galeria",
  "/admin/cupons": "Cupons",
  "/admin/bloqueios": "Bloqueios",
  "/admin/financeiro": "Financeiro",
  "/admin/perfil": "Meu perfil",
  "/admin/configuracao": "Configuração",
};

export function AdminLayout() {
  const { role, activeMembership } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const title = TITLES[location.pathname] ?? "Painel";

  return (
    <div className="app">
      <Sidebar
        role={role}
        shop={activeMembership}
        onNavigate={() => setMenuOpen(false)}
      />
      {menuOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="app__main">
        <Header title={title} onMenu={() => setMenuOpen((v) => !v)} />
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}