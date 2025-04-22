import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Save } from 'lucide-react';

import { useGetSystemSettings, useUpdateSystemSettings } from '../hooks/useSystemSettings';
import type { SystemSettings, UpdateSystemSettingsPayload } from '../types';

// --- Validation Schema ---
// Looser validation for optional fields
const settingsSchema = z.object({
    company_name: z.string().min(1, "Company name is required").max(100).nullable().optional(),
    company_address: z.string().max(255).nullable().optional(),
    company_logo_url: z.string().url({ message: "Must be a valid URL" }).max(255).nullable().optional(),
    company_email: z.string().email({ message: "Invalid email address" }).max(100).nullable().optional(),
    company_phone: z.string().max(20).nullable().optional(),
    bank_name: z.string().max(100).nullable().optional(),
    bank_account_name: z.string().max(100).nullable().optional(),
    bank_account_number: z.string().max(50).nullable().optional(),
    // Add validation for other fields if needed
});
type SettingsFormData = z.infer<typeof settingsSchema>;

// --- Component Props ---
interface CompanySettingsFormProps {
    // Potentially add props like onCancel if used in a dialog
}

// --- Main Component ---
export const CompanySettingsForm: React.FC<CompanySettingsFormProps> = () => {
    
    const { data: currentSettings, isLoading: isLoadingSettings, error: settingsError } = useGetSystemSettings();
    const updateSettingsMutation = useUpdateSystemSettings();

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: { // Initialize with empty strings or fetched data
            company_name: '',
            company_address: '',
            company_logo_url: '',
            company_email: '',
            company_phone: '',
            bank_name: '',
            bank_account_name: '',
            bank_account_number: ''
        },
    });

    // Reset form with fetched data when it loads
    useEffect(() => {
        if (currentSettings) {
            form.reset({
                company_name: currentSettings.company_name || '',
                company_address: currentSettings.company_address || '',
                company_logo_url: currentSettings.company_logo_url || '',
                company_email: currentSettings.company_email || '',
                company_phone: currentSettings.company_phone || '',
                bank_name: currentSettings.bank_name || '',
                bank_account_name: currentSettings.bank_account_name || '',
                bank_account_number: currentSettings.bank_account_number || '',
            });
        }
    }, [currentSettings, form.reset]);

    const onSubmit = (data: SettingsFormData) => {
         // Filter out empty strings and convert them to null for the database update
         const payload: UpdateSystemSettingsPayload = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
        ) as UpdateSystemSettingsPayload;

        console.log("Submitting Settings:", payload);
        updateSettingsMutation.mutate(payload);
    };

    // --- Loading State ---
    if (isLoadingSettings) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
            </Card>
        );
    }
    
    // --- Error State ---
    if (settingsError) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Settings</AlertTitle>
                <AlertDescription>
                    Could not load company settings. Please try again later. <br />
                    <span className="text-xs">{settingsError.message}</span>
                </AlertDescription>
            </Alert>
        );
    }

    // --- Render Form ---
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                        <CardDescription>Update your company's details used across the application, including invoices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name *</FormLabel>
                                    <FormControl><Input placeholder="Your Company Inc." {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="company_address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Address</FormLabel>
                                    <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} value={field.value ?? ''}/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="company_logo_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Logo URL</FormLabel>
                                    <FormControl><Input type="url" placeholder="https://example.com/logo.png" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormDescription>URL of your company logo (ensure it's publicly accessible).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="company_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Email</FormLabel>
                                        <FormControl><Input type="email" placeholder="contact@yourcompany.com" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="company_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Phone</FormLabel>
                                        <FormControl><Input placeholder="+1 123-456-7890" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Bank Details</CardTitle>
                        <CardDescription>Bank account details to display on invoices for payment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <FormField
                            control={form.control}
                            name="bank_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Name</FormLabel>
                                    <FormControl><Input placeholder="Global Mega Bank" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="bank_account_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name</FormLabel>
                                        <FormControl><Input placeholder="Your Company Inc." {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bank_account_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Number</FormLabel>
                                        <FormControl><Input placeholder="1234567890" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={updateSettingsMutation.isPending || !form.formState.isDirty}>
                            <Save className="mr-2 h-4 w-4" />
                            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}; 