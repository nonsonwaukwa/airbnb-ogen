import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider'; // Adjust path if needed
import { Loader2 } from 'lucide-react'; // Or your preferred loader

export const ProtectedRoute = () => {
  // Destructure user, loading, and authStage from the context
  const { user, loading, authStage } = useAuth();

  console.log('[ProtectedRoute] Rendering...', { loading, authStage, user: !!user });

  // 1. Show loading indicator while auth state is being determined
  if (loading || authStage === 'loading') {
    console.log('[ProtectedRoute] Auth loading, showing loading indicator.');
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Check if user needs to set their password (invite/recovery flow)
  // This check comes BEFORE the general !user check, because user might exist
  // but still need to set password.
  if (authStage === 'needs_password_set') {
    console.log('[ProtectedRoute] User needs password set, redirecting to /set-password.');
    // The component redirects to /set-password which is rendered directly in App.tsx
    // when authStage === 'needs_password_set'
    return <Navigate to="/set-password" replace />;
  }

  // 3. Check if user is unauthenticated (no user object AND stage is unauthenticated)
  if (!user || authStage === 'unauthenticated') {
    console.log('[ProtectedRoute] No user or unauthenticated stage, redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  // 4. If loading is finished, user exists, and stage is authenticated, render the child routes
  console.log('[ProtectedRoute] User authenticated, rendering Outlet.');
  return <Outlet />;
};
