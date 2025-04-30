import { Routes, Route, Navigate } from 'react-router-dom'; // Removed BrowserRouter import
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner'; // Assuming sonner is used for toasts

import { AuthProvider, useAuth } from '@/app/AuthProvider'; // Import AuthProvider and useAuth
import { ProtectedRoute } from '@/app/ProtectedRoute'; // Import ProtectedRoute
import { PublicRoute } from '@/app/PublicRoute'; // Import PublicRoute

import { LoginPage } from '@/features/auth/routes/LoginPage';
import { SetPasswordPage } from '@/features/auth/routes/SetPasswordPage';
import { LogoutHandler } from '@/features/auth/components/LogoutHandler';
import { Layout } from '@/components/Layout';
import { SettingsLayout } from '@/components/SettingsLayout'; // Added SettingsLayout import
import { StaffPage } from '@/features/staff/routes/StaffPage';
import { RolesPage } from '@/features/roles/routes/RolesPage';
import { PropertyCreatePage } from '@/features/properties/routes/PropertyCreatePage';
import { PropertyViewPage } from '@/features/properties/routes/PropertyViewPage';
import { SupplierListPage } from '@/features/suppliers/routes/SupplierListPage';
import { Loader2 } from 'lucide-react';
import { PropertiesPage } from '@/features/properties/routes/PropertiesPage';
import { BookingRoutes } from './features/bookings/routes'; // Import BookingRoutes
import { InvoiceListPage } from './features/invoices/pages/InvoiceListPage';
import { InvoiceViewPage } from './features/invoices/pages/InvoiceViewPage';
import { InvoiceFormPage } from './features/invoices/pages/InvoiceFormPage';
import { ApplicationSettingsPage } from './features/settings/routes/ApplicationSettingsPage';
import { InventoryPage } from '@/features/inventory/routes/InventoryPage';
import { ItemCatalogPage } from '@/features/inventory/routes/ItemCatalogPage';
import ProcurementPage from '@/features/procurement/routes/ProcurementPage';
import ProcurementViewPage from '@/features/procurement/routes/ProcurementViewPage';
import { IssueListPage } from '@/features/issues/pages/IssueListPage';
import { IssueFormPage } from '@/features/issues/pages/IssueFormPage';
import { IssueViewPage } from '@/features/issues/pages/IssueViewPage';

// Placeholder for Dashboard page
function DashboardPage() {
    return <div>Dashboard Content</div>;
}

// Placeholder for Profile Settings page
function ProfileSettingsPage() {
    return <div>Profile Settings Placeholder</div>;
}

// Create a Query Client
const queryClient = new QueryClient();

// Main App component rendering Providers and Routes
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes /> {/* Render routes within providers */}
        <Toaster richColors /> {/* Toast setup */}
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Separate component for routing logic to easily access useAuth
function AppRoutes() {
    const { authStage, loading } = useAuth();

    console.log('[App] Rendering with Auth State:', { loading, authStage });

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
    if (authStage === 'needs_password_set') {
        console.log('[App] Rendering SetPasswordPage');
        return <SetPasswordPage />;
    }

    // 3. Define all routes using wrappers
    return (
        <Routes>
            {/* Public Routes: Only accessible when logged out */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Protected Routes: Only accessible when logged in (and password set) */}
            <Route element={<ProtectedRoute />}>
                {/* Routes that use the main Layout (Sidebar/Header) */}
                <Route element={<Layout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    {/* Issues Section */}
                    <Route path="issues" element={<IssueListPage />} />
                    <Route path="issues/new" element={<IssueFormPage />} />
                    <Route path="issues/:id" element={<IssueViewPage />} />
                    <Route path="issues/:id/edit" element={<IssueFormPage />} />
                    {/* Properties Section */}
                    <Route path="properties" element={<PropertiesPage />} />
                    <Route path="properties/new" element={<PropertyCreatePage />} />
                    <Route path="properties/:id" element={<PropertyViewPage />} />
                    {/* Bookings Section - Delegate all nested routes */}
                    <Route path="bookings/*" element={<BookingRoutes />} />
                    {/* Invoices Section */}
                    <Route path="invoices" element={<InvoiceListPage />} />
                    <Route path="invoices/new" element={<InvoiceFormPage />} />
                    <Route path="invoices/edit/:invoiceId" element={<InvoiceFormPage />} />
                    <Route path="invoices/:invoiceId" element={<InvoiceViewPage />} />
                    {/* Inventory Section */}
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="inventory/catalog" element={<ItemCatalogPage />} />
                    {/* Procurement Section */}
                    <Route path="procurement" element={<ProcurementPage />} />
                    <Route path="procurement/:id" element={<ProcurementViewPage />} />
                    {/* Settings Section - Uses SettingsLayout */}
                    <Route path="/settings" element={<SettingsLayout />}>
                        {/* Index route redirects to default settings page */}
                        <Route index element={<Navigate to="/settings/roles" replace />} /> 
                        <Route path="profile" element={<ProfileSettingsPage />} /> {/* Placeholder */}
                        <Route path="roles" element={<RolesPage />} />
                        <Route path="suppliers" element={<SupplierListPage />} />
                        <Route path="application" element={<ApplicationSettingsPage />} />
                        {/* Add other nested settings routes here */}
                    </Route>
                    {/* Add other top-level protected routes with main layout here */}
                </Route>
                {/* Special protected routes without main Layout */}
                <Route path="/set-password" element={<SetPasswordPage />} /> {/* For direct URL navigation */}
                <Route path="/logout" element={<LogoutHandler />} />
            </Route>

            {/* Fallback / Not Found Route */}
            <Route path="*" element={ authStage === 'authenticated' ? <div>404 - Page Not Found</div> : <Navigate to="/login" replace /> } />
        </Routes>
    );
}

export default App;
