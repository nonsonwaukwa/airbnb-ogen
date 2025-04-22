import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useGetInvoice } from '../hooks/useInvoices';
import { InvoiceViewDisplay } from '../components/InvoiceViewDisplay';
import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const InvoiceViewPage: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const { permissions, loading: authLoading } = useAuth();
    const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useGetInvoice(invoiceId || null);

    const isLoading = authLoading || invoiceLoading;

    // --- Permission Check ---
    if (!isLoading && !permissions?.view_invoices) {
         return (
            <div className="container mx-auto py-10">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to view this invoice.
                    </AlertDescription>
                </Alert>
             </div>
        );
    }

    // --- Loading State ---
    // Use the InvoiceViewDisplay's internal skeleton for content loading
    // but show a page-level skeleton if auth is loading initially
    if (authLoading) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6 space-y-4">
                 <Skeleton className="h-8 w-48" /> 
                 <Skeleton className="h-96 w-full" /> 
            </div>
        );
    }

    // --- Error Handling ---
    if (invoiceError) {
         return (
            <div className="container mx-auto py-10">
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
                </Button>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Invoice</AlertTitle>
                    <AlertDescription>
                        {invoiceError.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // --- Invoice Not Found (after loading and no error) ---
    if (!isLoading && !invoice) {
        return (
            <div className="container mx-auto py-10 text-center">
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
                </Button>
                <p className="text-muted-foreground">Invoice not found.</p>
            </div>
        );
    }

    // --- Render Invoice Details ---
    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
             <div className="mb-4">
                 <Button variant="outline" size="sm" asChild>
                     <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
                 </Button>
            </div>
             {/* Render only when invoice is defined (guaranteed Invoice | null by previous checks) */}
             {/* We add this check mainly for TS, even if logic implies it */}
             {invoice !== undefined && (
                 <InvoiceViewDisplay invoice={invoice} isLoading={invoiceLoading} />
             )}
            {/* Add action buttons like Edit, Record Payment, Void here later based on status/permissions */}
        </div>
    );
}; 