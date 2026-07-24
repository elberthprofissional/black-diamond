import { type FC, type ReactNode } from 'react';

/**
 * StandaloneGuard: anteriormente bloqueava páginas públicas em modo PWA.
 * Agora apenas renderiza os children sem restrições.
 * Mantido como componente para evitar refatoração nas rotas que o utilizam.
 */
const StandaloneGuard: FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default StandaloneGuard;
