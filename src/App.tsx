import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import AuthGuard from './components/Admin/AuthGuard';
import PwaGuard from './components/PwaGuard';
import ErrorBoundary from './components/ErrorBoundary';

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
      <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
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
        <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<PwaGuard><Home /></PwaGuard>} />
            <Route path="/agendar" element={<PwaGuard><BookingPage /></PwaGuard>} />
            <Route path="/avaliar/:bookingId" element={<RatingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/agendar" element={<AuthGuard><AdminBooking /></AuthGuard>} />
            <Route path="/admin/weekly" element={<AuthGuard><AdminWeekly /></AuthGuard>} />
            <Route path="/admin/clients" element={<AuthGuard><AdminClients /></AuthGuard>} />
            <Route path="/admin/profile" element={<AuthGuard><AdminProfile /></AuthGuard>} />

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
