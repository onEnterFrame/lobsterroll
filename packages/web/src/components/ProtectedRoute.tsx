import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { currentAccount, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ocean">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🦞</div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentAccount) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
