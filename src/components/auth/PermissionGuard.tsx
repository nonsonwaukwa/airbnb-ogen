import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';

interface PermissionGuardProps {
    children: ReactNode;
    permission: string;
    fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, fallback }: PermissionGuardProps) {
    const { hasPermission } = useAuth();

    if (!hasPermission(permission)) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
} 