import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

// Assuming these types are correctly defined in ../types
import type { Invoice, CreateInvoicePayload, UpdateInvoicePayload, CreateInvoiceLineItemPayload, InvoiceLineItem } from '../types';

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
        const locale = ccy === 'NGN' ? 'en-NG' : undefined; // Example locale
        return amount.toLocaleString(locale, options);
    } catch (e) {
        console.error("Currency formatting error", e);
        return `${ccy} ${amount.toFixed(2)}`; // Fallback
    }
};

// Zod Schema Definition - Refined Number Handling
const lineItemSchema = z.object({
    id: z.string().uuid().optional(),
    description: z.string().min(1, { message: 'Description is required' }),
    quantity: z.coerce
        .number({ invalid_type_error: 'Must be a number' })
        .positive({ message: 'Quantity must be positive' })
        .default(1),
    unit_price: z.coerce
        .number({ invalid_type_error: 'Must be a number' })
        .nonnegative({ message: 'Unit price cannot be negative' })
        .default(0),
});

const invoiceFormSchema = z.object({
    customer_name: z.string().min(1, { message: 'Customer name is required' }),
    customer_email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
    customer_phone: z.string().optional().or(z.literal('')),
    customer_address_street: z.string().optional().or(z.literal('')),
    customer_address_city: z.string().optional().or(z.literal('')),
    customer_address_state: z.string().optional().or(z.literal('')),
    customer_address_postal_code: z.string().optional().or(z.literal('')),
    customer_address_country: z.string().optional().or(z.literal('')),
    issue_date: z.date({ required_error: "Issue date is required." }),
    due_date: z.date().nullable().optional(),
    currency: z.string().length(3, { message: 'Currency code required' }).default('NGN'),
    notes: z.string().optional().or(z.literal('')),
    discount_amount: z.coerce
        .number({ invalid_type_error: "Must be a number" })
        .nonnegative({ message: "Discount cannot be negative" })
        .optional()
        .default(0),
    tax_amount: z.coerce
        .number({ invalid_type_error: "Must be a number" })
        .nonnegative({ message: "Tax cannot be negative" })
        .optional()
        .default(0),
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
    const isEditing = !!initialData?.id;

    const form = useForm({
        resolver: zodResolver(invoiceFormSchema),
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
            line_items: initialData?.invoice_line_items?.map((item: InvoiceLineItem) => ({
                id: item.id,
                description: item.description ?? '',
                quantity: item.quantity ?? 1,
                unit_price: item.unit_price ?? 0
            })) ?? [{ description: '', quantity: 1, unit_price: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "line_items"
    });

    const watchLineItems = form.watch('line_items');
    const watchDiscount = form.watch('discount_amount') ?? 0;
    const watchTax = form.watch('tax_amount') ?? 0;
    const watchCurrency = form.watch('currency');

    const subtotal = useMemo(() => {
        return (watchLineItems ?? []).reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            return sum + (qty * price);
        }, 0);
    }, [watchLineItems]);

    const total = useMemo(() => {
        const discount = Number(watchDiscount) || 0;
        const tax = Number(watchTax) || 0;
        return subtotal - discount + tax;
    }, [subtotal, watchDiscount, watchTax]);

    const handleFormSubmit = (data: InvoiceFormData) => {
         const payloadBase = {
            customer_name: data.customer_name,
            customer_email: data.customer_email || null,
            customer_phone: data.customer_phone || null,
            customer_address_street: data.customer_address_street || null,
            customer_address_city: data.customer_address_city || null,
            customer_address_state: data.customer_address_state || null,
            customer_address_postal_code: data.customer_address_postal_code || null,
            customer_address_country: data.customer_address_country || null,
            issue_date: format(data.issue_date, 'yyyy-MM-dd'),
            due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
            currency: data.currency,
            notes: data.notes || null,
            discount_amount: data.discount_amount ?? 0,
            tax_amount: data.tax_amount ?? 0,
            line_items: data.line_items.map(item => ({
                id: item.id,
                description: item.description,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price)
            }))
        };

        if (isEditing && initialData) {
             const updatePayload: UpdateInvoicePayload = {
                id: initialData.id,
                ...payloadBase,
                line_items: payloadBase.line_items,
            };
            onSubmit(updatePayload, true);
        } else {
            const createPayload: CreateInvoicePayload = {
                ...payloadBase,
                line_items: payloadBase.line_items.map(({ id, ...rest }) => rest) as CreateInvoiceLineItemPayload[],
                booking_id: null,
                payment_method: null,
                payment_date: null, // Added to satisfy CreateInvoicePayload type
                // payment_date: null, // payment_date likely doesn't exist on your type/table
                // Ensure all required fields from CreateInvoicePayload are present
                status: 'draft', // Example: Add default status if required
                amount_paid: 0, // Example: Add default amount_paid if required
            };
            onSubmit(createPayload, false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">

                {/* Customer Info Card */}
                 <Card>
                    <CardHeader>
                        <CardTitle>Customer Information</CardTitle>
                        <CardDescription>Details of the person or company being billed.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control as any} name="customer_name" render={({ field }) => ( <FormItem> <FormLabel>Customer Name *</FormLabel> <FormControl><Input placeholder="Enter customer name" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" placeholder="customer@example.com" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_phone" render={({ field }) => ( <FormItem> <FormLabel>Phone</FormLabel> <FormControl><Input placeholder="(123) 456-7890" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_address_street" render={({ field }) => ( <FormItem> <FormLabel>Street Address</FormLabel> <FormControl><Input placeholder="123 Main St" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_address_city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input placeholder="City" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_address_state" render={({ field }) => ( <FormItem> <FormLabel>State/Province</FormLabel> <FormControl><Input placeholder="State" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_address_postal_code" render={({ field }) => ( <FormItem> <FormLabel>Postal Code</FormLabel> <FormControl><Input placeholder="Postal Code" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="customer_address_country" render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input placeholder="Country" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                    </CardContent>
                </Card>

                {/* Invoice Details Card */}
                 <Card>
                     <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <FormField control={form.control as any} name="issue_date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Issue Date *</FormLabel>
                                <Popover>
                                    {/* PopoverTrigger now directly wraps Button */}
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    {/* FormControl removed from here */}
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control as any} name="due_date" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Due Date</FormLabel>
                                <Popover>
                                     {/* PopoverTrigger now directly wraps Button */}
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                     {/* FormControl removed from here */}
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control as any} name="currency" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Currency *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? 'NGN'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                                <SelectContent> <SelectItem value="NGN">NGN (Nigerian Naira)</SelectItem> <SelectItem value="USD">USD (US Dollar)</SelectItem> <SelectItem value="EUR">EUR (Euro)</SelectItem> <SelectItem value="GBP">GBP (British Pound)</SelectItem> </SelectContent>
                            </Select> <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                 {/* Line Items Card */}
                 <Card>
                    <CardHeader> <CardTitle>Invoice Items</CardTitle> <CardDescription>Add items being billed in this invoice.</CardDescription> </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 border p-4 rounded-md relative">
                                <div className="grid grid-cols-1 sm:grid-cols-11 gap-4 flex-grow">
                                    <FormField control={form.control as any} name={`line_items.${index}.description`} render={({ field }) => ( <FormItem className="sm:col-span-5"> <FormLabel className={index !== 0 ? 'sr-only' : ''}>Description *</FormLabel> <FormControl><Input placeholder="Item description" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={form.control as any} name={`line_items.${index}.quantity`} render={({ field }) => ( <FormItem className="sm:col-span-2"> <FormLabel className={index !== 0 ? 'sr-only' : ''}>Quantity *</FormLabel> <FormControl><Input type="number" step="any" placeholder="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={form.control as any} name={`line_items.${index}.unit_price`} render={({ field }) => ( <FormItem className="sm:col-span-3"> <FormLabel className={index !== 0 ? 'sr-only' : ''}>Unit Price *</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <div className="sm:col-span-1 flex items-end pb-2"> <span className="text-sm text-muted-foreground whitespace-nowrap"> {formatCurrency((form.getValues(`line_items.${index}.quantity`) ?? 0) * (form.getValues(`line_items.${index}.unit_price`) ?? 0), watchCurrency)} </span> </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1} className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 mt-1"> <Trash2 className="h-4 w-4" /> <span className="sr-only">Remove Item</span> </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}> <Plus className="mr-2 h-4 w-4" /> Add Item </Button>
                        {form.formState.errors.line_items && !form.formState.errors.line_items.root && ( <p className="text-sm font-medium text-destructive">Please check errors in line items.</p> )}
                         {form.formState.errors.line_items?.root?.message && ( <p className="text-sm font-medium text-destructive">{form.formState.errors.line_items.root.message}</p> )}
                    </CardContent>
                 </Card>

                 {/* Totals & Notes Section */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <FormField control={form.control as any} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes</FormLabel> <FormControl><Textarea placeholder="Add any additional notes here..." className="resize-none min-h-[120px]" {...field} value={field.value ?? ''} /></FormControl> <FormDescription>Optional notes that will appear on the invoice.</FormDescription> <FormMessage /> </FormItem> )} />
                    </div>
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                        <FormField control={form.control as any} name="discount_amount" render={({ field }) => ( <FormItem> <FormLabel>Discount Amount</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control as any} name="tax_amount" render={({ field }) => ( <FormItem> <FormLabel>Tax Amount</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
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

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading}>
                         {isLoading ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}
                    </Button>
                </div>
            </form>
        </Form>
    );
};
