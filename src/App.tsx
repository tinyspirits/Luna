import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Home as HomeIcon, PlusCircle, Calendar as CalendarIcon, Settings as SettingsIcon } from 'lucide-react';
import Home from './pages/Home';
import Log from './pages/Log';
import CalendarPage from './pages/Calendar';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  // Do not show navigation on auth page or if not logged in
  if (!currentUser || location.pathname === '/auth') return null;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <HomeIcon size={24} />
        <span>Hôm nay</span>
      </Link>
      <Link to="/calendar" className={`nav-item ${location.pathname === '/calendar' ? 'active' : ''}`}>
        <CalendarIcon size={24} />
        <span>Lịch</span>
      </Link>
      <Link to="/log" className={`nav-item ${location.pathname === '/log' ? 'active' : ''}`}>
        <PlusCircle size={28} className="text-primary" />
        <span>Ghi chép</span>
      </Link>
      <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
        <SettingsIcon size={24} />
        <span>Cài đặt</span>
      </Link>
    </nav>
  );
};

// Private Route Component
const PrivateRoute = ({ children }: { children: ReactElement }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/auth" />;
  }
  return children;
};

// Public Route (redirects to Home if already logged in)
const PublicRoute = ({ children }: { children: ReactElement }) => {
  const { currentUser } = useAuth();
  if (currentUser) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="app-container">
          <div className="content-area">
            <Routes>
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              
              <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
              <Route path="/log" element={<PrivateRoute><Log /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            </Routes>
          </div>
          <Navigation />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
