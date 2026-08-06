import { type FC } from 'react';
import UniversalLogin from './UniversalLogin';

/**
 * Rota legada /admin/login — agora é a Porta Única aberta direto no modo
 * administrador (e-mail + senha). AuthGuard e deep-links continuam funcionando.
 */
const AdminLogin: FC = () => <UniversalLogin adminMode />;

export default AdminLogin;
