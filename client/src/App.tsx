import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { WatchlistProvider } from './contexts/WatchlistContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Live from './pages/Live';
import News from './pages/News';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-ink-secondary text-sm">
        <span className="w-2 h-2 rounded-full bg-forest animate-pulseDot" />
        Loading EquityIQ…
      </div>
    </div>
  );
}

// Wraps every authenticated page in a single WatchlistProvider + Layout
// (left sidebar + content area). All routes inside this <Route> render
// inside <Outlet /> in Layout.
function AuthenticatedShell() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <WatchlistProvider>
      <Layout>
        <Outlet />
      </Layout>
    </WatchlistProvider>
  );
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route element={<AuthenticatedShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/live" element={<Live />} />
        <Route path="/news" element={<News />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
