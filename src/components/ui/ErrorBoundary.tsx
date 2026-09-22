import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Evita que um erro inesperado derrube a aplicação inteira (tela branca). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Sem stack trace no console? Registra apenas o fato; o usuário
    // vê uma tela amigável com opção de recarregar.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="card" style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
            <h3>Ops, algo deu errado</h3>
            <p className="text-muted">
              Um imprevisto aconteceu por aqui. Recarregue a página para continuar.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}