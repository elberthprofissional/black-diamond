import { lazy, Suspense, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { Loading } from "./components/ui/Loading";
import type { EffectiveRole } from "./types";

const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const BookingPage = lazy(() =>
  import("./pages/public/BookingPage").then((m) => ({ default: m.BookingPage }))
);
const ManagePage = lazy(() =>
  import("./pages/public/ManagePage").then((m) => ({ default: m.ManagePage }))
);
const HomePage = lazy(() =>
  import("./pages/public/HomePage").then((m) => ({ default: m.HomePage }))
);
const AgendaPage = lazy(() =>
  import("./pages/admin/AgendaPage").then((m) => ({ default: m.AgendaPage }))
);
const AppointmentsPage = lazy(() =>
  import("./pages/admin/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage }))
);
const ClientsPage = lazy(() =>
  import("./pages/admin/ClientsPage").then((m) => ({ default: m.ClientsPage }))
);
const ServicesPage = lazy(() =>
  import("./pages/admin/ServicesPage").then((m) => ({ default: m.ServicesPage }))
);
const TeamPage = lazy(() =>
  import("./pages/admin/TeamPage").then((m) => ({ default: m.TeamPage }))
);
const GalleryPage = lazy(() =>
  import("./pages/admin/GalleryPage").then((m) => ({ default: m.GalleryPage }))
);
const CouponsPage = lazy(() =>
  import("./pages/admin/CouponsPage").then((m) => ({ default: m.CouponsPage }))
);
const BlockedPage = lazy(() =>
  import("./pages/admin/BlockedPage").then((m) => ({ default: m.BlockedPage }))
);
const FinancePage = lazy(() =>
  import("./pages/admin/FinancePage").then((m) => ({ default: m.FinancePage }))
);
const ProfilePage = lazy(() =>
  import("./pages/admin/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import("./pages/admin/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const SuperAdminPage = lazy(() =>
  import("./pages/superadmin/SuperAdminPage").then((m) => ({ default: m.SuperAdminPage }))
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

function FullPageLoader() {
  return <Loading label="Carregando aplicação..." full />;
}

function RootRedirect() {
  const { isSuperadmin, activeMembership, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (isSuperadmin) return <Navigate to="/sistema" replace />;
  if (activeMembership) return <Navigate to="/admin" replace />;
  return <Navigate to="/black-diamond" replace />;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireMembership({ children }: { children: ReactNode }) {
  const { activeMembership, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!activeMembership) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: EffectiveRole[]; children: ReactNode }) {
  const { role } = useAuth();
  if (role && roles.includes(role)) return <>{children}</>;
  return (
    <div className="page">
      <div className="card">
        <h3>Sem acesso</h3>
        <p className="text-muted">Esta área é restrita ao dono da barbearia.</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/black-diamond" element={<HomePage />} />
        <Route path="/:slug" element={<HomePage />} />
        <Route path="/agendar/:slug" element={<BookingPage />} />
        <Route path="/gerenciar/:slug" element={<ManagePage />} />

        <Route
          path="/sistema"
          element={
            <RequireAuth>
              <RequireRole roles={["superadmin"]}>
                <SuperAdminPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireMembership>
                <AdminLayout />
              </RequireMembership>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/agenda" replace />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route
            path="agendamentos"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <AppointmentsPage />
              </RequireRole>
            }
          />
          <Route path="clientes" element={<ClientsPage />} />
          <Route
            path="servicos"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <ServicesPage />
              </RequireRole>
            }
          />
          <Route
            path="equipe"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <TeamPage />
              </RequireRole>
            }
          />
          <Route
            path="galeria"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <GalleryPage />
              </RequireRole>
            }
          />
          <Route
            path="cupons"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <CouponsPage />
              </RequireRole>
            }
          />
          <Route path="bloqueios" element={<BlockedPage />} />
          <Route
            path="financeiro"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <FinancePage />
              </RequireRole>
            }
          />
          <Route path="perfil" element={<ProfilePage />} />
          <Route
            path="configuracao"
            element={
              <RequireRole roles={["superadmin", "owner"]}>
                <SettingsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}