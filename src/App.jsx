import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/Shell';
import { useAuth } from './store/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Finance = lazy(() => import('./pages/Finance'));
const MapLive = lazy(() => import('./pages/MapLive'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const Portal = lazy(() => import('./pages/Portal'));

function Loader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'linear-gradient(145deg, #FF7A1A, #E85D04)',
        animation: 'pulse 1.2s infinite', boxShadow: '0 10px 28px rgba(255,122,26,.4)',
      }} />
      <p className="small" style={{ color: 'var(--text-3)' }}>Chargement du module…</p>
    </div>
  );
}

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const isClient = String(user?.role).toLowerCase() === 'client';

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={isClient ? '/portail' : '/dashboard'} replace /> : <Login />} />
        <Route
          element={
            <Protected>
              <Shell />
            </Protected>
          }
        >
          <Route path="/" element={<Navigate to={isClient ? '/portail' : '/dashboard'} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/livraisons" element={<Deliveries />} />
          <Route path="/chauffeurs" element={<Drivers />} />
          <Route path="/vehicules" element={<Vehicles />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/carte" element={<MapLive />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/administration" element={<Admin />} />
          <Route path="/portail" element={<Portal />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
