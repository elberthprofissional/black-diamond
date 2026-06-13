import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import BookingPage from './pages/BookingPage';

// Final Sync: 14:38
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0A0A0A]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
