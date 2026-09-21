import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Icon } from "../components/ui/Icon";

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar onNavigate={() => setMenuOpen(false)} />

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="app__main">
        <main className="app__content">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        className="icon-btn icon-btn--menu menu-fab"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Abrir menu"
      >
        <Icon name="menu" size={20} />
      </button>
    </div>
  );
}