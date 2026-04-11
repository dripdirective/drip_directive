import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const AuthPage = lazy(() => import('../pages/AuthPage'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const OverviewPage = lazy(() => import('../pages/OverviewPage'));
const ProfileStudioPage = lazy(() => import('../pages/ProfileStudioPage'));
const RecommendationsLabPage = lazy(() => import('../pages/RecommendationsLabPage'));
const WardrobeStudioPage = lazy(() => import('../pages/WardrobeStudioPage'));

function RouteLoader() {
  return (
    <div className="boot-screen">
      <div className="boot-panel">
        <p className="page-eyebrow">Loading</p>
        <h2 className="page-title">Opening your app</h2>
      </div>
    </div>
  );
}

function withSuspense(element) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={withSuspense(<LandingPage />)} />
      <Route
        path="/auth"
        element={
          isAuthenticated
            ? <Navigate to="/app/overview" replace />
            : withSuspense(<AuthPage />)
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={withSuspense(<OverviewPage />)} />
          <Route path="profile" element={withSuspense(<ProfileStudioPage />)} />
          <Route path="wardrobe" element={withSuspense(<WardrobeStudioPage />)} />
          <Route path="recommendations" element={withSuspense(<RecommendationsLabPage />)} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/app/overview' : '/'} replace />}
      />
    </Routes>
  );
}
