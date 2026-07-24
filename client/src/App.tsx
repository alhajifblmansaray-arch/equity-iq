import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { AiJobsProvider } from './contexts/AiJobsContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Live from './pages/Live';
import News from './pages/News';
import Compare from './pages/Compare';
import Calendar from './pages/Calendar';
import Alerts from './pages/Alerts';
import Learn from './pages/Learn';
import Simulator from './pages/Simulator';
import Challenge from './pages/Challenge';
import Profile from './pages/Profile';
import Journal from './pages/Journal';
import Portfolio from './pages/Portfolio';

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

function AuthenticatedShell() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AiJobsProvider>
      <WatchlistProvider>
        <Layout>
          <Outlet />
        </Layout>
      </WatchlistProvider>
    </AiJobsProvider>
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
        <Route path="/compare" element={<Compare />} />
        <Route path="/live" element={<Live />} />
        <Route path="/news" element={<News />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/portfolio" element={<Portfolio />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
