import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSupplier, useUpdateSupplier } from '../hooks/useSuppliers';
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types';

// Zod Schema for Supplier Form
const supplierFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters." }).trim(),
  contact_person: z.string().trim().nullish(),
  email: z.string().email({ message: "Invalid email address." }).nullish().or(z.literal('')), // Allow empty string or valid email
  phone: z.string().trim().nullish(),
  address_street: z.string().trim().nullish(),
  address_city: z.string().trim().nullish(),
  address_lga: z.string().trim().nullish(),
  address_state: z.string().trim().nullish(),
  category: z.string().trim().nullish(),
  notes: z.string().trim().nullish(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  supplier: Supplier | null; // Supplier data for editing, null for creating
}

export function SupplierFormDialog({ isOpen, setIsOpen, supplier }: SupplierFormDialogProps) {
  const isEditMode = !!supplier;
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contact_person: null,
      email: null,
      phone: null,
      address_street: null,
      address_city: null,
      address_lga: null,
      address_state: null,
      category: null,
      notes: null,
      status: 'active',
    },
  });

  // Reset form when dialog opens or supplier data changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && supplier) {
        reset({
          id: supplier.id,
          name: supplier.name,
          contact_person: supplier.contact_person ?? null,
          email: supplier.email ?? null,
          phone: supplier.phone ?? null,
          address_street: supplier.address_street ?? null,
          address_city: supplier.address_city ?? null,
          address_lga: supplier.address_lga ?? null,
          address_state: supplier.address_state ?? null,
          category: supplier.category ?? null,
          notes: supplier.notes ?? null,
          status: (supplier.status as 'active' | 'inactive' | undefined) ?? 'active',
        });
      } else {
        reset({
          name: '',
          contact_person: null,
          email: null,
          phone: null,
          address_street: null,
          address_city: null,
          address_lga: null,
          address_state: null,
          category: null,
          notes: null,
          status: 'active',
        });
      }
    }
  }, [isOpen, supplier, isEditMode, reset]);

  const onSubmit = async (values: SupplierFormValues) => {
    // Prepare payload ensuring null for empty optional fields
    const payload = {
      ...values,
      contact_person: values.contact_person || null,
      email: values.email || null,
      phone: values.phone || null,
      address_street: values.address_street || null,
      address_city: values.address_city || null,
      address_lga: values.address_lga || null,
      address_state: values.address_state || null,
      category: values.category || null,
      notes: values.notes || null,
    };

    try {
      if (isEditMode && values.id) {
        await updateMutation.mutateAsync({ ...payload, id: values.id });
      } else {
        const { id, ...createData } = payload;
        await createMutation.mutateAsync(createData as CreateSupplierPayload);
      }
      setIsOpen(false); // Close dialog on success
    } catch (error) {
      // Error handled by mutation hook (toast)
      console.error("Supplier form submission error:", error);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this supplier.' : 'Fill in the details for the new supplier.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Use grid layout for form fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" {...register('name')} className="col-span-3" disabled={isLoading} />
            {errors.name && <p className="col-span-4 text-right text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Input id="category" {...register('category')} className="col-span-3" disabled={isLoading} placeholder="e.g., Plumbing, Electrical"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact_person" className="text-right">Contact Person</Label>
            <Input id="contact_person" {...register('contact_person')} className="col-span-3" disabled={isLoading} />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" {...register('email')} className="col-span-3" disabled={isLoading} />
             {errors.email && <p className="col-span-4 text-right text-xs text-red-600">{errors.email.message}</p>}
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <Input id="phone" {...register('phone')} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address_street" className="text-right">Address Street</Label>
            <Input id="address_street" {...register('address_street')} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address_city" className="text-right">City</Label>
            <Input id="address_city" {...register('address_city')} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address_lga" className="text-right">LGA</Label>
            <Input id="address_lga" {...register('address_lga')} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address_state" className="text-right">State</Label>
            <Input id="address_state" {...register('address_state')} className="col-span-3" disabled={isLoading} />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                 <Controller
                    name="status"
                    control={control}
                    render={({ field }: { field: any }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'active'} disabled={isLoading}>
                        <SelectTrigger className="col-span-3"> <SelectValue /> </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="active">Active</SelectItem>
                             <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
          </div>
          <div className="grid grid-cols-4 items-start gap-4"> {/* Changed items-center to items-start for textarea */}
            <Label htmlFor="notes" className="text-right pt-2">Notes</Label> {/* Added padding top to label */}
            <Textarea id="notes" {...register('notes')} className="col-span-3" disabled={isLoading} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 