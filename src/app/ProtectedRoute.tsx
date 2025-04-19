import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react'; // Use a loading spinner

export const ProtectedRoute = () => {
  const { user, loading } = useAuth(); // Get user and loading state

  console.log('[ProtectedRoute] Rendering...', { loading, user: !!user }); // Log render state

  if (loading) {
    // Show a loading indicator while checking auth state
    console.log('[ProtectedRoute] Auth loading, showing loading indicator.'); // Log loading state
    return (
      // Render loader directly, centered on screen
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // If not loading and no user, redirect to login
    console.log('[ProtectedRoute] No user found, redirecting to /login.'); // Log redirection
    return <Navigate to="/login" replace />;
  }

  // If loading is finished and user exists, render the child routes via Outlet
  console.log('[ProtectedRoute] User found, rendering Outlet for protected content.'); // Log successful access
  return <Outlet />;
}; 