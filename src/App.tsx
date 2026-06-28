import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import AuthGuard from './components/Admin/AuthGuard';
import PwaGuard from './components/PwaGuard';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatusBanner from './components/ConnectionStatusBanner';

const TITLES: Record<string, string> = {
  '/': 'Black Diamond | Barbearia Premium',
  '/agendar': 'Agendar Horário | Black Diamond',
  '/admin': 'Painel Admin | Black Diamond',
  '/admin/login': 'Login Admin | Black Diamond',
  '/admin/agendar': 'Novo Agendamento | Black Diamond',
  '/admin/weekly': 'Agenda Semanal | Black Diamond',
  '/admin/clients': 'Clientes | Black Diamond',

  '/admin/profile': 'Perfil | Black Diamond',
  '/admin/reset-password': 'Redefinir Senha | Black Diamond',
};

function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] || 'Black Diamond';
  }, [pathname]);
  return null;
}

const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const RatingPage = lazy(() => import('./pages/RatingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminResetPassword = lazy(() => import('./pages/AdminResetPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminWeekly = lazy(() => import('./pages/AdminWeekly'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminBooking = lazy(() => import('./pages/AdminBooking'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function RouteErrorFallback({ routeName }: { routeName: string }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6" role="alert">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Erro em {routeName}</h2>
          <p className="text-sm text-zinc-500 mt-1">Algo deu errado nesta página.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="h-10 px-6 bg-[#C5A059] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#A68233] transition-all cursor-pointer"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}

function App() {
  const reducedMotion = useReducedMotion();
  return (
    <Router>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <TitleManager />
      <div className="min-h-screen bg-[#0f0f0f]">
        <ConnectionStatusBanner />
        <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Home" />}><PwaGuard><Home /></PwaGuard></ErrorBoundary>} />
            <Route path="/agendar" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Agendamento" />}><PwaGuard><BookingPage /></PwaGuard></ErrorBoundary>} />
            <Route path="/avaliar/:bookingId" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Avaliação" />}><RatingPage /></ErrorBoundary>} />
            <Route path="/admin/login" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Login" />}><AdminLogin /></ErrorBoundary>} />
            <Route path="/admin/reset-password" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Redefinir Senha" />}><AdminResetPassword /></ErrorBoundary>} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Dashboard" />}><AuthGuard><AdminDashboard /></AuthGuard></ErrorBoundary>} />
            <Route path="/admin/agendar" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Novo Agendamento" />}><AuthGuard><AdminBooking /></AuthGuard></ErrorBoundary>} />
            <Route path="/admin/weekly" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Agenda Semanal" />}><AuthGuard><AdminWeekly /></AuthGuard></ErrorBoundary>} />
            <Route path="/admin/clients" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Clientes" />}><AuthGuard><AdminClients /></AuthGuard></ErrorBoundary>} />
            <Route path="/admin/profile" element={<ErrorBoundary fallback={<RouteErrorFallback routeName="Perfil" />}><AuthGuard><AdminProfile /></AuthGuard></ErrorBoundary>} />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
      </MotionConfig>
    </Router>
  );
}

export default App;
