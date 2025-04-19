import { Routes, Route, Outlet } from 'react-router-dom';
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { StaffPage } from '@/features/staff/routes/StaffPage';
import { RolesPage } from '@/features/roles/routes/RolesPage';

// Placeholder for a Dashboard page
function DashboardPage() {
    return <div>Dashboard Content</div>;
}

function App() {
    return (
        <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes - Use original ProtectedRoute component */}
            <Route element={<ProtectedRoute />}>
                {/* Layout component renders Sidebar/Header and Outlet for children */}
                {/* ProtectedRoute renders Outlet, which renders this Route element -> Layout */}
                <Route path="/" element={<Layout />}>
                   {/* These routes are rendered by the <Outlet> INSIDE <Layout> */}
                   <Route index element={<DashboardPage />} />
                   <Route path="staff" element={<StaffPage />} />
                   <Route path="settings/roles" element={<RolesPage />} />
                   {/* Other feature routes... */}
                </Route>
                 {/* Add other top-level protected routes if needed (without the main layout) */}
            </Route>

            {/* Optional: Catch-all route for 404 */}
            <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
    );
}

export default App;
