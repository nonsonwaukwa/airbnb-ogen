import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

import { useGetInvoice, useCreateInvoice, useUpdateInvoice } from '../hooks/useInvoices';
import { InvoiceForm } from '../components/InvoiceForm';
import type { CreateInvoicePayload, UpdateInvoicePayload } from '../types';
import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const InvoiceFormPage: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId?: string }>(); // invoiceId is optional for 'new'
    const navigate = useNavigate();
    const { permissions, loading: authLoading } = useAuth();
    const isEditing = Boolean(invoiceId);

    // Fetch existing invoice data only if editing
    const { 
        data: existingInvoice, 
        isLoading: invoiceLoading, 
        error: invoiceError 
    } = useGetInvoice(invoiceId || null);

    const createInvoiceMutation = useCreateInvoice();
    const updateInvoiceMutation = useUpdateInvoice();

    const isLoading = authLoading || (isEditing && invoiceLoading);
    const mutationLoading = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;

    // --- Permission Checks ---
    const canPerformAction = isEditing ? permissions?.edit_invoices : permissions?.add_invoices;
    if (!isLoading && !canPerformAction) {
         return (
             <div className="container mx-auto py-10">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You do not have permission to {isEditing ? 'edit' : 'create'} invoices.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    // --- Handle Invoice Loading Error (Edit Mode) ---
    if (isEditing && invoiceError) {
         return (
             <div className="container mx-auto py-10">
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
                </Button>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Invoice</AlertTitle>
                    <AlertDescription>{invoiceError.message}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    // --- Handle Invoice Not Found (Edit Mode) ---
     if (isEditing && !isLoading && !existingInvoice) {
        return (
            <div className="container mx-auto py-10 text-center">
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link to="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
                </Button>
                <p className="text-muted-foreground">Invoice not found for editing.</p>
            </div>
        );
    }

    // --- Form Submission Logic ---
    const handleFormSubmit = (data: CreateInvoicePayload | UpdateInvoicePayload) => {
        if (isEditing) {
            // Ensure ID is included for update payload
             const updatePayload = data as UpdateInvoicePayload;
            updateInvoiceMutation.mutate({ ...updatePayload, id: invoiceId! }, {
                onSuccess: (updatedInvoice) => {
                    // Navigate to the view page after successful update
                    navigate(`/invoices/${updatedInvoice.id}`);
                }
                // onError is handled globally by the hook
            });
        } else {
            const createPayload = data as CreateInvoicePayload;
             createInvoiceMutation.mutate(createPayload, {
                onSuccess: (newInvoice) => {
                    // Navigate to the view page after successful creation
                    navigate(`/invoices/${newInvoice.id}`);
                }
                // onError is handled globally by the hook
            });
        }
    };

    // --- Page Title ---
    const pageTitle = isEditing ? `Edit Invoice #${existingInvoice?.invoice_number || invoiceId}` : 'Create New Invoice';

    // --- Render Loading Skeleton ---
     if (isLoading) {
         return (
            <div className="container mx-auto py-6 px-4 md:px-6 space-y-4">
                <Skeleton className="h-8 w-1/2" /> 
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    // --- Render Form ---
    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                 <Button variant="outline" size="sm" asChild>
                    <Link to={isEditing ? `/invoices/${invoiceId}` : "/invoices"}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
                {/* Consider adding a Save button here linked to form submit? */}
            </div>

            <InvoiceForm 
                onSubmit={handleFormSubmit}
                initialData={isEditing ? existingInvoice : null} 
                isLoading={mutationLoading} 
            />
        </div>
    );
}; 