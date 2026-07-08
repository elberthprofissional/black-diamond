import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import AuthGuard from './components/Admin/AuthGuard';
import PwaGuard from './components/PwaGuard';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatusBanner from './components/ConnectionStatusBanner';

const TITLES: Record<string, string> = {
  '/': 'BLACK DIAMOND',
  '/agendar': 'Agendar Horário | Black Diamond',
  '/admin': 'Painel Admin | Black Diamond',
  '/admin/login': 'Login Admin | Black Diamond',
  '/admin/agendar': 'Novo Agendamento | Black Diamond',
  '/admin/weekly': 'Agenda da Semana | Black Diamond',
  '/admin/clients': 'Clientes | Black Diamond',

  '/admin/profile': 'Perfil | Black Diamond',
  '/admin/reset-password': 'Redefinir Senha | Black Diamond',
  '/cancelar': 'Cancelar ou Reagendar | Black Diamond',
  '/avaliar/:bookingId': 'Avaliar Atendimento | Black Diamond',
  '/gerenciar': 'Gerenciar Agendamento | Black Diamond',
};

function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const pageTitle = TITLES[pathname] || 'Black Diamond';
    document.title = pageTitle;

    // Send pageview event to Google Analytics on route transition
    const gaId = import.meta.env.VITE_GA_ID;
    if (gaId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: pathname,
        send_to: gaId,
      });
    }
  }, [pathname]);
  return null;
}

const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminResetPassword = lazy(() => import('./pages/AdminResetPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminWeekly = lazy(() => import('./pages/AdminWeekly'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminBooking = lazy(() => import('./pages/AdminBooking'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CancelPage = lazy(() => import('./pages/CancelPage'));
const RatingPage = lazy(() => import('./pages/RatingPage'));
const ManageBooking = lazy(() => import('./pages/ManageBooking'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
        <div className="flex gap-1">
          <div
            className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-[#C5A059] animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

function App() {
  const reducedMotion = useReducedMotion();
  return (
    <Router>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        <TitleManager />
        <div className="min-h-screen bg-[#0f0f0f]">
          <ConnectionStatusBanner />
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <PwaGuard>
                      <Home />
                    </PwaGuard>
                  }
                />
                <Route
                  path="/agendar"
                  element={
                    <PwaGuard>
                      <BookingPage />
                    </PwaGuard>
                  }
                />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                <Route path="/cancelar" element={<CancelPage />} />
                <Route path="/avaliar/:bookingId" element={<RatingPage />} />
                <Route path="/gerenciar" element={<ManageBooking />} />

                {/* Protected Admin Routes — single AuthGuard check */}
                <Route
                  path="/admin"
                  element={
                    <AuthGuard>
                      <AdminDashboard />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/agendar"
                  element={
                    <AuthGuard>
                      <AdminBooking />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/weekly"
                  element={
                    <AuthGuard>
                      <AdminWeekly />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/clients"
                  element={
                    <AuthGuard>
                      <AdminClients />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/admin/profile"
                  element={
                    <AuthGuard>
                      <AdminProfile />
                    </AuthGuard>
                  }
                />

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
