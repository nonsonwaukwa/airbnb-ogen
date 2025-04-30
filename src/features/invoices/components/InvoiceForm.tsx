import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

import type { Invoice, CreateInvoicePayload, UpdateInvoicePayload, CreateInvoiceLineItemPayload } from '../types';
// import { formatCurrency } from '@/lib/utils'; // Assuming formatCurrency is moved/available here

// Temporary formatCurrency function - TODO: Move to lib/utils
const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    const ccy = currency || 'NGN'; // Default currency
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: ccy,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    try {
        return amount.toLocaleString(undefined, options);
    } catch (e) {
        console.error("Currency formatting error", e);
        return `${ccy} ${amount.toFixed(2)}`; // Fallback
    }
};

// Zod Schema Definition
const lineItemSchema = z.object({
    description: z.string().min(1, { message: 'Description is required' }),
    quantity: z.preprocess((val) => (val === "" ? undefined : Number(val)), 
                      z.number({invalid_type_error: 'Must be a number'}).positive({ message: 'Quantity must be positive' })),
    unit_price: z.preprocess((val) => (val === "" ? undefined : Number(val)), 
                      z.number({invalid_type_error: 'Must be a number'}).nonnegative({ message: 'Unit price cannot be negative' }))
});

const invoiceFormSchema = z.object({
    customer_name: z.string().min(1, { message: 'Customer name is required' }),
    customer_email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
    customer_phone: z.string().optional(),
    customer_address_street: z.string().optional(),
    customer_address_city: z.string().optional(),
    customer_address_state: z.string().optional(),
    customer_address_postal_code: z.string().optional(),
    customer_address_country: z.string().optional(),
    issue_date: z.date({ required_error: "Issue date is required." }),
    due_date: z.date().optional().nullable(),
    currency: z.string().min(3, { message: 'Currency code required' }).default('NGN'),
    notes: z.string().optional(),
    discount_amount: z.preprocess((val) => (val === "" ? 0 : Number(val)), 
                            z.number().nonnegative().default(0).optional()), 
    tax_amount: z.preprocess((val) => (val === "" ? 0 : Number(val)), 
                           z.number().nonnegative().default(0).optional()), 
    line_items: z.array(lineItemSchema).min(1, { message: 'At least one line item is required' })
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// Component Props
interface InvoiceFormProps {
  onSubmit: (data: CreateInvoicePayload | UpdateInvoicePayload, isEditing: boolean) => void;
  initialData?: Invoice | null;
  isLoading?: boolean;
}

// Main Form Component
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, initialData = null, isLoading = false }) => {
    const isEditing = !!initialData;

    // Explicitly provide the type to useForm
    const form = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceFormSchema),
        // Default values remain the same
        defaultValues: {
            customer_name: initialData?.customer_name ?? '',
            customer_email: initialData?.customer_email ?? '',
            customer_phone: initialData?.customer_phone ?? '',
            customer_address_street: initialData?.customer_address_street ?? '',
            customer_address_city: initialData?.customer_address_city ?? '',
            customer_address_state: initialData?.customer_address_state ?? '',
            customer_address_postal_code: initialData?.customer_address_postal_code ?? '',
            customer_address_country: initialData?.customer_address_country ?? '',
            issue_date: initialData?.issue_date ? new Date(initialData.issue_date) : new Date(),
            due_date: initialData?.due_date ? new Date(initialData.due_date) : null,
            currency: initialData?.currency ?? 'NGN',
            notes: initialData?.notes ?? '',
            discount_amount: initialData?.discount_amount ?? 0,
            tax_amount: initialData?.tax_amount ?? 0,
            line_items: initialData?.invoice_line_items?.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price
            })) ?? [{ description: '', quantity: 1, unit_price: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "line_items"
    });

    // Watch form fields for dynamic calculations
    const watchLineItems = form.watch('line_items');
    const watchDiscount = form.watch('discount_amount') ?? 0;
    const watchTax = form.watch('tax_amount') ?? 0;
    const watchCurrency = form.watch('currency');

    // Calculate totals dynamically
    const subtotal = React.useMemo(() => { 
        return (watchLineItems ?? []).reduce((sum, item) => {
            const qty = item.quantity ?? 0;
            const price = item.unit_price ?? 0;
            return sum + (qty * price);
        }, 0);
    }, [watchLineItems]);

    const total = React.useMemo(() => {
        return subtotal - watchDiscount + watchTax;
    }, [subtotal, watchDiscount, watchTax]);

    // Handle form submission
    // Provide explicit type for data parameter
    const handleFormSubmit = (data: InvoiceFormData) => {
         const payload = { 
            ...data,
            discount_amount: data.discount_amount ?? 0,
            tax_amount: data.tax_amount ?? 0,
            issue_date: format(data.issue_date, 'yyyy-MM-dd'),
            due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null, 
            line_items: data.line_items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price
            })) as CreateInvoiceLineItemPayload[]
        };

        if (isEditing && initialData) {
            onSubmit({ ...payload, id: initialData.id }, true);
        } else {
            const createPayload: CreateInvoicePayload = {
                customer_name: payload.customer_name,
                currency: payload.currency,
                issue_date: payload.issue_date,
                line_items: payload.line_items,
                ...(payload.customer_email && { customer_email: payload.customer_email }),
                ...(payload.customer_phone && { customer_phone: payload.customer_phone }),
                ...(payload.customer_address_street && { customer_address_street: payload.customer_address_street }),
                ...(payload.customer_address_city && { customer_address_city: payload.customer_address_city }),
                ...(payload.customer_address_state && { customer_address_state: payload.customer_address_state }),
                ...(payload.customer_address_postal_code && { customer_address_postal_code: payload.customer_address_postal_code }),
                ...(payload.customer_address_country && { customer_address_country: payload.customer_address_country }),
                ...(payload.due_date && { due_date: payload.due_date }),
                ...(payload.notes && { notes: payload.notes }),
                ...(payload.discount_amount && { discount_amount: payload.discount_amount }),
                ...(payload.tax_amount && { tax_amount: payload.tax_amount }),
            }
            onSubmit(createPayload, false);
        }
    };

    return (
        // Pass the specific form type to the Form component
        <Form {...form}> 
            {/* Explicitly type the onSubmit handler passed to form */}
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                
                {/* Customer Info - Fields remain the same */}
                 <Card>
                    <CardHeader>
                        <CardTitle>Customer Information</CardTitle>
                        <CardDescription>Details of the person or company being billed.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="customer_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer Name *</FormLabel>
                                <FormControl><Input placeholder="Enter customer name" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="customer_email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input type="email" placeholder="customer@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="customer_phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="customer_address_street" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} /> 
                        {/* Add other address fields similarly */}
                    </CardContent>
                </Card>

                {/* Invoice Details - Fields remain the same, fix Calendar prop */}
                 <Card>
                     <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <FormField control={form.control} name="issue_date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Issue Date *</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="due_date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                {/* Correctly handle null for selected prop */} 
                                <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="currency" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Currency *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                                <SelectContent>
                                <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem>
                                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                 {/* Line Items - Fields remain the same */}
                 <Card>
                    <CardHeader>
                        <CardTitle>Invoice Items</CardTitle>
                        <CardDescription>Add items being billed in this invoice.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 border p-4 rounded-md relative">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow">
                                    <FormField control={form.control} name={`line_items.${index}.description`} render={({ field }) => (
                                        <FormItem className="sm:col-span-3">
                                            <FormLabel>Description *</FormLabel>
                                            <FormControl><Input placeholder="Item description" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={`line_items.${index}.quantity`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity *</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name={`line_items.${index}.unit_price`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unit Price *</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Item</span>
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                        {form.formState.errors.line_items?.message && (
                             <p className="text-sm font-medium text-destructive">{form.formState.errors.line_items.message}</p>
                        )}
                    </CardContent>
                 </Card>

                 {/* Totals & Notes - Fields remain the same */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea placeholder="Add any additional notes here..." className="resize-none" {...field} /></FormControl>
                            <FormDescription>Optional notes that will appear on the invoice.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <div className="space-y-4">
                        <FormField control={form.control} name="discount_amount" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Discount Amount</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tax_amount" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tax Amount</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <Separator />
                        <div className="space-y-2 text-right">
                             <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrency(subtotal, watchCurrency)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span>-{formatCurrency(watchDiscount, watchCurrency)}</span></div>
                             <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax:</span><span>{formatCurrency(watchTax, watchCurrency)}</span></div>
                             <Separator className="my-1"/>
                            <div className="flex justify-between font-semibold text-lg"><span>Total:</span><span>{formatCurrency(total, watchCurrency)}</span></div>
                        </div>
                    </div>
                 </div>

                {/* Submit Button - Remains the same */}
                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                         {isLoading ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}; 
 
 
 
 
 
 