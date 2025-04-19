import React from 'react'; // Import React if using JSX directly
import { Routes, Route, Outlet, Navigate, BrowserRouter } from 'react-router-dom'; // Keep BrowserRouter import for main.tsx if needed there
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner'; // Assuming sonner is used for toasts

import { AuthProvider, useAuth } from '@/app/AuthProvider'; // Import AuthProvider and useAuth
import { ProtectedRoute } from '@/app/ProtectedRoute'; // Import ProtectedRoute
import { PublicRoute } from '@/app/PublicRoute'; // Import PublicRoute

import { LoginPage } from '@/features/auth/routes/LoginPage';
import { SetPasswordPage } from '@/features/auth/routes/SetPasswordPage';
import { LogoutHandler } from '@/features/auth/components/LogoutHandler';
import { Layout } from '@/components/Layout';
import { StaffPage } from '@/features/staff/routes/StaffPage';
import { RolesPage } from '@/features/roles/routes/RolesPage';
import { Loader2 } from 'lucide-react';

// Placeholder for Dashboard page
function DashboardPage() {
    return <div>Dashboard Content</div>;
}

// Create a Query Client
const queryClient = new QueryClient();

// Main App component rendering Providers and Routes
// REMOVED BrowserRouter from here
function App() {
  return (
    // BrowserRouter should wrap <App /> in main.tsx
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes /> {/* Render routes within providers */}
        <Toaster richColors /> {/* Toast setup */}
      </AuthProvider>
    </QueryClientProvider>
    // BrowserRouter removed from here
  );
}

// Separate component for routing logic to easily access useAuth
function AppRoutes() {
    const { authStage, loading, user } = useAuth();
    const isSetPasswordPath = window.location.pathname === '/set-password' || 
                             window.location.pathname.includes('type=recovery');

    console.log('[App] Rendering with Auth State:', { loading, authStage, isSetPasswordPath });

    // 1. Show loading indicator while checking auth state
    if (loading || authStage === 'loading') {
        console.log('[App] Showing Global Loader');
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // 2. If user needs to set password, show only that page
    //    This overrides all other routing until password is set.
    if (authStage === 'needs_password_set' || (user && isSetPasswordPath)) {
        console.log('[App] Rendering SetPasswordPage', { authStage, isSetPasswordPath });
        return <SetPasswordPage />;
    }

    // 3. Define all routes using wrappers
    return (
        <Routes>
            {/* Public Routes: Only accessible when logged out */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                {/* Add other public-only routes like /forgot-password here if needed */}
            </Route>

            {/* Protected Routes: Only accessible when logged in (and password set) */}
            <Route element={<ProtectedRoute />}>
                {/* Routes that use the main Layout (Sidebar/Header) */}
                <Route element={<Layout />}>
                    <Route path="/" element={<DashboardPage />} /> {/* Default route */}
                    <Route path="dashboard" element={<DashboardPage />} /> {/* Explicit dashboard */}
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="settings/roles" element={<RolesPage />} />
                    {/* Add other protected routes with layout here */}
                </Route>
                {/* Special protected routes */}
                <Route path="/set-password" element={<SetPasswordPage />} /> {/* For direct URL navigation */}
                <Route path="/logout" element={<LogoutHandler />} />
            </Route>

            {/* Fallback / Not Found Route */}
            {/* Redirect to login if not authenticated, otherwise show 404 */}
            <Route path="*" element={ authStage === 'authenticated' ? <div>404 - Page Not Found</div> : <Navigate to="/login" replace /> } />
        </Routes>
    );
}

export default App;
