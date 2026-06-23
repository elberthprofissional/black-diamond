import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/Admin/AuthGuard';

const Home = lazy(() => import('./pages/Home'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminWeekly = lazy(() => import('./pages/AdminWeekly'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminAvailableSlots = lazy(() => import('./pages/AdminAvailableSlots'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminBooking = lazy(() => import('./pages/AdminBooking'));
const AdminReminders = lazy(() => import('./pages/AdminReminders'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-800 border-t-[#C5A059] rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f0f0f]">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agendar" element={<BookingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/agendar" element={<AuthGuard><AdminBooking /></AuthGuard>} />
            <Route path="/admin/weekly" element={<AuthGuard><AdminWeekly /></AuthGuard>} />
            <Route path="/admin/clients" element={<AuthGuard><AdminClients /></AuthGuard>} />
            <Route path="/admin/reminders" element={<AuthGuard><AdminReminders /></AuthGuard>} />
            <Route path="/admin/available" element={<AuthGuard><AdminAvailableSlots /></AuthGuard>} />
            <Route path="/admin/profile" element={<AuthGuard><AdminProfile /></AuthGuard>} />
            
            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
