import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="notfound">
      <span className="notfound__code">404</span>
      <h1>Página não encontrada</h1>
      <p className="text-muted">
        O endereço não existe ou foi removido. Confira o link ou volte para o início.
      </p>
      <Link to="/" className="btn">
        Voltar ao início
      </Link>
    </div>
  );
}