import React from 'react';
import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

import { CompanySettingsForm } from '../components/CompanySettingsForm';

export const ApplicationSettingsPage: React.FC = () => {
    const { permissions, loading: authLoading } = useAuth();

    // --- Permission Check ---
    // Show loading skeleton if auth is loading, then check permission
    if (authLoading) {
         return (
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-72 w-full" /> 
            </div>
         );
    }
    
    if (!permissions?.manage_system_settings) {
         return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to manage application settings.
                </AlertDescription>
            </Alert>
        );
    }

    // --- Render Form ---
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Application Settings</h2>
                <p className="text-sm text-muted-foreground">
                   Manage company details, invoice settings, and other application-wide configurations.
                </p>
            </div>
            <CompanySettingsForm />
        </div>
    );
}; 
 
 
 
 
 
 