import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__side">
        <span className="auth__side-label">Login administrativo</span>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__brand auth__brand--mobile">
            <img src="/logo.webp" alt="BLACK DIAMOND" className="auth__logo" />
            <strong>
              BLACK <span className="sidebar__brand-gold">DIAMOND</span>
            </strong>
          </div>
          {children}
          <p className="auth__hint">Acesso restrito à equipe.</p>
        </div>
        <p className="auth__foot">
          © {new Date().getFullYear()} BLACK DIAMOND
        </p>
      </main>
    </div>
  );
}