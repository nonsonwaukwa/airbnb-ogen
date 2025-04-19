import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider'; // Import useAuth
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { SetPasswordPage } from '@/features/auth/routes/SetPasswordPage'; // Import the real component
import { LogoutHandler } from '@/features/auth/components/LogoutHandler'; // Import LogoutHandler
import { Layout } from '@/components/Layout';
import { StaffPage } from '@/features/staff/routes/StaffPage';
import { RolesPage } from '@/features/roles/routes/RolesPage';
import { Loader2 } from 'lucide-react'; // Import loader

// Placeholder for Dashboard page
function DashboardPage() {
    return <div>Dashboard Content</div>;
}

// Removed the placeholder SetPasswordPage function

function App() {
    const { authStage, loading } = useAuth();

    console.log('[App] Rendering with Auth State:', { loading, authStage });

    // 1. Show loading indicator while checking auth state
    if (loading && authStage === 'loading') { // Check authStage too
        console.log('[App] Showing Global Loader');
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // 2. If user needs to set password, show only that page
    if (authStage === 'needs_password_set') {
        console.log('[App] Rendering SetPasswordPage');
        // Render the actual SetPasswordPage component now
        return <SetPasswordPage />; 
    }

    // 3. Main routing based on authenticated or unauthenticated stage
    return (
        <Routes>
            {authStage === 'unauthenticated' ? (
                // --- Unauthenticated Routes ---
                <>
                    <Route path="/login" element={<LoginPage />} />
                    {/* Redirect any other path to login if unauthenticated */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            ) : (
                // --- Authenticated Routes (already logged in) ---
                <>
                    {/* Route to handle logout action */}
                    <Route path="/logout" element={<LogoutHandler />} />
                    
                    {/* Layout component renders Sidebar/Header and Outlet for children */}
                    <Route path="/" element={<Layout />}>
                        <Route index element={<DashboardPage />} />
                        <Route path="staff" element={<StaffPage />} />
                        <Route path="settings/roles" element={<RolesPage />} />
                        {/* Add other authenticated routes here */}
                        {/* Catch-all inside authenticated routes (optional - could redirect to dashboard) */}
                        <Route path="*" element={<div>404 - Authenticated Page Not Found</div>} /> 
                    </Route>
                </>
            )}
        </Routes>
    );
}

export default App;
