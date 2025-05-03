import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from 'lucide-react';

import { useRecordInvoicePayment } from '../hooks/useInvoices';
import type { RecordPaymentPayload } from '../types';

// Helper - TODO: Move to utils
const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    const ccy = currency || 'NGN';
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: ccy, minimumFractionDigits: 2, maximumFractionDigits: 2 };
    try { return amount.toLocaleString(undefined, options); } catch (e) { return `${ccy} ${amount.toFixed(2)}`; }
};

// --- Validation Schema ---
const recordPaymentSchema = z.object({
    amount: z.coerce.number({
        required_error: "Payment amount is required",
        invalid_type_error: "Amount must be a number",
      }).positive({ message: "Amount must be positive" }),
    payment_date: z.date({ required_error: "Payment date is required" }),
    payment_method: z.string().min(1, { message: "Payment method is required" }),
});
type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;

// --- Component Props ---
interface RecordPaymentDialogProps {
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
    currentAmountPaid: number;
    currency: string;
    // Control the dialog open state from the parent
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

// --- Main Component ---
export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({ 
    invoiceId,
    invoiceNumber,
    totalAmount,
    currentAmountPaid,
    currency,
    isOpen,
    onOpenChange
 }) => {
    
    const amountDue = Math.max(0, (totalAmount || 0) - (currentAmountPaid || 0));
    const recordPaymentMutation = useRecordInvoicePayment();

    const form = useForm<RecordPaymentFormData>({
        resolver: zodResolver(recordPaymentSchema),
        defaultValues: {
            amount: amountDue > 0 ? parseFloat(amountDue.toFixed(2)) : undefined, // Pre-fill amount due if positive
            payment_date: new Date(),
            payment_method: 'bank_transfer', // Default method
        },
    });

    useEffect(() => {
        // Reset form when dialog opens or relevant props change
        if (isOpen) {
            const newAmountDue = Math.max(0, (totalAmount || 0) - (currentAmountPaid || 0));
            form.reset({
                amount: newAmountDue > 0 ? parseFloat(newAmountDue.toFixed(2)) : undefined,
                payment_date: new Date(),
                payment_method: 'bank_transfer'
            });
        }
    }, [isOpen, invoiceId, totalAmount, currentAmountPaid, form]);

    const onSubmit = (data: RecordPaymentFormData) => {
        const payload: RecordPaymentPayload = {
            id: invoiceId,
            amount: data.amount,
            payment_date: format(data.payment_date, 'yyyy-MM-dd'),
            payment_method: data.payment_method,
        };
        
        recordPaymentMutation.mutate(payload, {
            onSuccess: () => {
                onOpenChange(false); // Close dialog on success
                form.reset(); // Reset form fields
            }
            // onError is handled by the hook globally
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment for Invoice #{invoiceNumber}</DialogTitle>
                    <DialogDescription>
                        Amount Due: {formatCurrency(amountDue, currency)}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                         <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Amount *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="Enter amount paid" 
                                            {...field} 
                                        />
                                    </FormControl>
                                     <FormDescription>
                                        Max: {formatCurrency(amountDue, currency)}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="payment_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Payment Date *</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        // Consider disabling future dates?
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select payment method" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {/* Common payment methods */}
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="card">Credit/Debit Card</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="pos">POS</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                         />
                         <DialogFooter>
                             <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                             </DialogClose>
                            <Button type="submit" disabled={recordPaymentMutation.isPending}>
                                {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}; 