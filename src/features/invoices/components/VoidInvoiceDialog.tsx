import React from 'react';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

import { useVoidInvoice } from '../hooks/useInvoices';

// --- Component Props ---
interface VoidInvoiceDialogProps {
    invoiceId: string;
    invoiceNumber: string;
    // Control the dialog open state from the parent
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

// --- Main Component ---
export const VoidInvoiceDialog: React.FC<VoidInvoiceDialogProps> = ({ 
    invoiceId,
    invoiceNumber,
    isOpen,
    onOpenChange
 }) => {
    
    const voidInvoiceMutation = useVoidInvoice();

    const handleConfirmVoid = () => {
        if (!invoiceId) return;

        voidInvoiceMutation.mutate(invoiceId, {
            onSuccess: () => {
                onOpenChange(false); // Close dialog on success
            }
            // onError is handled by the hook globally via toast
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Void Invoice</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to void Invoice #{invoiceNumber}? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                
                 <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        Voiding this invoice will mark it as cancelled and it will no longer be considered active or payable.
                    </AlertDescription>
                </Alert>

                <DialogFooter className="mt-6">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={voidInvoiceMutation.isPending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleConfirmVoid} 
                        disabled={voidInvoiceMutation.isPending}
                    >
                        {voidInvoiceMutation.isPending ? 'Voiding...' : 'Confirm Void'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 
 
 
 
 
 
 