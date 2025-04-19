import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider'; // Adjust path if needed
import { Loader2 } from 'lucide-react'; // Or your preferred loader

export function PublicRoute() {
  // Get authentication state using the custom hook
  const { user, session, loading, authStage } = useAuth();

  // Show loading indicator while checking authentication state
  // Important to prevent brief flash of login page for authenticated users
  if (loading || authStage === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated (has user object or session), redirect them away
  // from the public route (e.g., login page) to the main dashboard/app page.
  // Also check if they need to set password - if so, they shouldn't be on login page either
  if (user || session || authStage === 'needs_password_set') {
    // Redirect to the main authenticated route (e.g., dashboard at '/')
    return <Navigate to="/" replace />;
  }

  // If user is not authenticated and not loading, render the child route (e.g., LoginPage)
  return <Outlet />;
}
