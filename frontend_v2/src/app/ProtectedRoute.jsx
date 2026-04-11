import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';

export default function ProtectedRoute() {
  const { booting, isAuthenticated } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-panel">
          <div className="brand-mark brand-mark--centered">
            <BrandMark />
          </div>
          <p className="boot-copy">Opening your app...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
