import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InvoiceListTable } from '../components/InvoiceListTable';
import { useAuth } from '@/app/AuthProvider'; // Assuming AuthProvider is in app
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useGetInvoices } from '../hooks/useInvoices'; // Import hook to fetch invoices
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

export const InvoiceListPage: React.FC = () => {
    // Assuming the loading state property is `loading` - adjust if needed
    const { permissions, loading: authLoading } = useAuth(); 
    const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useGetInvoices();

    // Combine loading states
    const isLoading = authLoading || invoicesLoading;

    // Basic permission check (can be refined)
    if (!isLoading && !permissions?.view_invoices) {
        return (
            <div className="container mx-auto py-10">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view invoices.
                    </AlertDescription>
                </Alert>
             </div>
        );
    }
    
    // --- Error Handling for Invoice Fetch ---
    if (invoicesError) {
        return (
             <div className="container mx-auto py-10">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Invoices</AlertTitle>
                    <AlertDescription>
                        {invoicesError.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Invoices</h1>
                 {/* Show button only if permissions allow and auth isn't loading */}
                {!authLoading && permissions?.add_invoices && (
                    <Button asChild>
                        <Link to="/invoices/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
                        </Link>
                    </Button>
                )}
                 {/* Show skeleton only if auth is loading */}
                 {authLoading && (
                    <Skeleton className="h-10 w-32" /> 
                )}
            </div>
            {/* Pass fetched data and loading state to the table */}
            <InvoiceListTable 
                invoices={invoices || []} 
                isLoading={isLoading} 
                // Optionally pass permissions if table needs them for row actions
                // permissions={permissions} 
             /> 
        </div>
    );
}; 
 
 
 
 
 
 