import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__logo">◆</span>
          <strong>BLACK DIAMOND</strong>
          <span>Sistema de gestão para barbearias</span>
        </div>
        {children}
      </div>
      <p className="auth__foot">
        © {new Date().getFullYear()} BLACK DIAMOND — acesso restrito à equipe.
      </p>
    </div>
  );
}