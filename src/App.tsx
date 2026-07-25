import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Routes, Route, useLocation, matchPath } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useSEO } from './hooks/useSEO';
import AdminLayout from './components/Admin/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatusBanner from './components/ConnectionStatusBanner';
import StandaloneGuard from './components/StandaloneGuard';
import { BarberProvider } from './contexts/BarberContext';
import BarberGuard from './components/Barber/BarberGuard';
import { logError } from './lib/logger';

const TITLES: Record<string, string> = {
  '/': 'BLACK DIAMOND',
  '/agendar': 'Agendar Horário | Black Diamond',
  '/admin': 'Painel Admin | Black Diamond',
  '/admin/login': 'Login Admin | Black Diamond',
  '/admin/agendar': 'Novo Agendamento | Black Diamond',
  '/admin/weekly': 'Agenda da Semana | Black Diamond',
  '/admin/clients': 'Clientes | Black Diamond',
  '/admin/profile': 'Perfil | Black Diamond',
  '/admin/reports': 'Relatórios | Black Diamond',
  '/admin/reset-password': 'Redefinir Senha | Black Diamond',
  '/cancelar': 'Cancelar ou Reagendar | Black Diamond',
  '/gerenciar/:token?': 'Gerenciar Agendamento | Black Diamond',
  '/cliente': 'Meus Agendamentos | Black Diamond',
  '/admin/notificacoes': 'Notificações | Black Diamond',
  '/admin/onboarding': 'Configuração Inicial | Black Diamond',
  '/barber': 'Meu Dia | Black Diamond',
};

function TitleManager() {
  const { pathname } = useLocation();
  const pageTitle = useMemo(() => {
    if (TITLES[pathname]) return TITLES[pathname] ?? 'Black Diamond';
    for (const pattern of Object.keys(TITLES)) {
      if (pattern.includes(':') && matchPath(pattern, pathname)) {
        return TITLES[pattern] ?? 'Black Diamond';
      }
    }
    return 'Black Diamond';
  }, [pathname]);

  useSEO({ title: pageTitle });

  useEffect(() => {
    try {
      const gaId = import.meta.env.VITE_GA_ID;
      if (gaId && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_title: pageTitle,
          page_location: window.location.href,
          page_path: pathname,
          send_to: gaId,
        });
      }
    } catch (e) {
      logError(e);
      // GA is optional
    }
  }, [pathname, pageTitle]);
  return null;
}

// Lazy-loaded route components
const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminResetPassword = lazy(() => import('./pages/AdminResetPassword'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminWeekly = lazy(() => import('./pages/AdminWeekly'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminBooking = lazy(() => import('./pages/AdminBooking'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CancelPage = lazy(() => import('./pages/CancelPage'));
const ManageBooking = lazy(() => import('./pages/ManageBooking'));
const ClientProfile = lazy(() => import('./components/ClientProfile'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

// Route preloader - preloads route chunks on hover/focus for instant navigation
const routePreloaders = new Map<string, () => Promise<unknown>>();

function preloadRoute(path: string) {
  if (routePreloaders.has(path)) {
    routePreloaders.get(path)?.();
    return;
  }

  const preloaders: Record<string, () => Promise<unknown>> = {
    '/agendar': () => import('./pages/BookingPage'),
    '/admin': () => import('./pages/AdminDashboard'),
    '/admin/login': () => import('./pages/AdminLogin'),
    '/admin/weekly': () => import('./pages/AdminWeekly'),
    '/admin/clients': () => import('./pages/AdminClients'),
    '/admin/profile': () => import('./pages/AdminProfile'),
    '/admin/reports': () => import('./pages/AdminReports'),
    '/admin/agendar': () => import('./pages/AdminBooking'),
    '/cancelar': () => import('./pages/CancelPage'),
    '/gerenciar': () => import('./pages/ManageBooking'),
    '/cliente': () => import('./components/ClientProfile'),
    '/admin/notificacoes': () => import('./pages/NotificationsPage'),
    '/admin/onboarding': () => import('./pages/OnboardingPage'),
    '/barber': () => import('./pages/BarberDashboard'),
  };

  const preloader = preloaders[path];
  if (preloader) {
    routePreloaders.set(path, preloader);
    preloader();
  }
}

function LoadingFallback() {
  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Página está carregando"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 border-zinc-800 border-t-[#D4AF37] rounded-full animate-spin"
          aria-hidden="true"
        />
        <div className="flex gap-1" aria-hidden="true">
          <div
            className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span className="sr-only" role="alert">
          Carregando... Aguarde um momento.
        </span>
      </div>
    </div>
  );
}

// Section-level ErrorBoundary wrapper
function SectionErrorBoundary({ children, name }: { children: ReactNode; name: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <p className="text-sm text-zinc-500">Erro ao carregar {name}.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function App() {
  const reducedMotion = useReducedMotion();
  const { pathname } = useLocation();

  // Preload next likely route based on current path
  useEffect(() => {
    const preloadPaths: Record<string, string[]> = {
      '/': ['/agendar'],
      '/agendar': ['/cancelar', '/gerenciar'],
      '/admin': ['/admin/weekly', '/admin/reports', '/admin/clients', '/admin/profile'],
      '/admin/login': ['/admin'],
    };

    const paths = preloadPaths[pathname];
    if (paths) {
      // Preload after a short delay to avoid impacting initial render
      const timer = setTimeout(() => {
        paths.forEach(preloadRoute);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Add PWA standalone class to body for CSS targeting
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.body.classList.add('pwa-context');
    }
    const handler = (e: MediaQueryListEvent) => {
      document.body.classList.toggle('pwa-context', e.matches);
    };
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <TitleManager />
      <div className="min-h-screen bg-[#0f0f0f] overflow-x-hidden">
        <ConnectionStatusBanner />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path="/admin/login"
                element={
                  <SectionErrorBoundary name="Login">
                    <AdminLogin />
                  </SectionErrorBoundary>
                }
              />
              <Route
                path="/admin/reset-password"
                element={
                  <SectionErrorBoundary name="Redefinir Senha">
                    <AdminResetPassword />
                  </SectionErrorBoundary>
                }
              />

              {/* Onboarding — configuração inicial */}
              <Route
                path="/admin/onboarding"
                element={
                  <AdminLayout hideNavbar hideBottomTabs>
                    <OnboardingPage />
                  </AdminLayout>
                }
              />

              <Route
                path="/admin/notificacoes"
                element={
                  <AdminLayout>
                    <NotificationsPage />
                  </AdminLayout>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/agendar"
                element={
                  <AdminLayout>
                    <AdminBooking />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/weekly"
                element={
                  <AdminLayout>
                    <AdminWeekly />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <AdminLayout>
                    <AdminClients />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <AdminLayout>
                    <AdminProfile />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminLayout>
                    <AdminReports />
                  </AdminLayout>
                }
              />

              {/* Barber Route - simplified dashboard for barber employees */}
              <Route
                path="/barber"
                element={
                  <AdminLayout>
                    <BarberGuard>
                      <BarberDashboard />
                    </BarberGuard>
                  </AdminLayout>
                }
              />

              {/* Public client routes - blocked in PWA standalone mode */}
              <Route
                path="/"
                element={
                  <StandaloneGuard>
                    <SectionErrorBoundary name="Página Inicial">
                      <Home />
                    </SectionErrorBoundary>
                  </StandaloneGuard>
                }
              />
              <Route
                path="/agendar"
                element={
                  <BarberProvider>
                    <StandaloneGuard>
                      <SectionErrorBoundary name="Agendamento">
                        <BookingPage />
                      </SectionErrorBoundary>
                    </StandaloneGuard>
                  </BarberProvider>
                }
              />
              <Route
                path="/cancelar"
                element={
                  <StandaloneGuard>
                    <SectionErrorBoundary name="Cancelar Agendamento">
                      <CancelPage />
                    </SectionErrorBoundary>
                  </StandaloneGuard>
                }
              />
              <Route
                path="/gerenciar/:token?"
                element={
                  <StandaloneGuard>
                    <SectionErrorBoundary name="Gerenciar Agendamento">
                      <ManageBooking />
                    </SectionErrorBoundary>
                  </StandaloneGuard>
                }
              />
              <Route
                path="/cliente"
                element={
                  <StandaloneGuard>
                    <SectionErrorBoundary name="Perfil do Cliente">
                      <ClientProfile />
                    </SectionErrorBoundary>
                  </StandaloneGuard>
                }
              />

              {/* Catch-all 404 Route */}
              <Route
                path="*"
                element={
                  <SectionErrorBoundary name="Página não encontrada">
                    <NotFound />
                  </SectionErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </MotionConfig>
  );
}

export default App;
