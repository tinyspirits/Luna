import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Home as HomeIcon, PlusCircle, Calendar as CalendarIcon, Settings as SettingsIcon, BarChart2 } from 'lucide-react';
import Home from './pages/Home';
import Log from './pages/Log';
import CalendarPage from './pages/Calendar';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Insights from './pages/Insights';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { analyzeImageBrightness } from './utils/colorUtils';

// Wrapper để quản lý Background theo cá nhân hóa
const ThemeWrapper = ({ children }: { children: ReactElement }) => {
  const { profile, currentUser } = useAuth();
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  useEffect(() => {
    let bg = profile?.themeBackground;
    let imageSource = '';
    if (bg === 'local' && currentUser) {
      const localBg = localStorage.getItem(`custom_bg_${currentUser.uid}`);
      if (localBg) {
        bg = `url(${localBg})`;
        imageSource = localBg;
      } else {
        bg = 'var(--background)'; // Fallback nếu không thấy ảnh
      }
    } else if (bg && bg.startsWith('url(')) {
      // Trích xuất URL từ chuỗi url('...')
      const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match) imageSource = match[1];
    } else if (bg && bg.startsWith('http')) {
       imageSource = bg;
       bg = `url(${bg})`;
    }

    if (bg && bg !== 'var(--background)' && !bg.includes('gradient')) {
      document.body.style.background = 'transparent';
      setBgImage(bg);
      
      // Phân tích độ sáng ảnh
      if (imageSource) {
        analyzeImageBrightness(imageSource).then(theme => {
          if (theme === 'light') {
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
          } else {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
          }
        });
      }
    } else {
      document.body.style.background = bg && bg !== 'var(--background)' ? bg : 'var(--background)';
      setBgImage(null);
      // Reset về theme mặc định của OS
      document.body.classList.remove('theme-light', 'theme-dark');
    }
  }, [profile?.themeBackground, currentUser]);
  
  return (
    <>
      {bgImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: -1,
          background: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
      )}
      {children}
    </>
  );
};

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
      <Link to="/insights" className={`nav-item ${location.pathname === '/insights' ? 'active' : ''}`}>
        <BarChart2 size={24} />
        <span>Phân tích</span>
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
      <ThemeWrapper>
        <HashRouter>
          <div className="app-container">
            <div className="content-area">
              <Routes>
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                <Route path="/log" element={<PrivateRoute><Log /></PrivateRoute>} />
                <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
                <Route path="/insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              </Routes>
            </div>
            <Navigation />
          </div>
        </HashRouter>
      </ThemeWrapper>
    </AuthProvider>
  );
}

export default App;
