// Added useCallback to the import statement (should already be present)
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload'; // Assuming this component exists and works
import { useCreateProperty, useUpdateProperty } from '../hooks/useProperties'; // Assuming these hooks exist
import type { Property, CreatePropertyPayload, UpdatePropertyPayload, PropertyImage } from '../types'; // Import relevant types
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea if needed within form structure
import { cn } from '@/lib/utils'; // Import cn utility

// Define constants for select options
const PROPERTY_TYPES = ['Apartment', 'House', 'Duplex', 'Townhouse', 'Bungalow', 'Other'];
const PROPERTY_STATUSES = ['available', 'booked', 'maintenance', 'unavailable']; // Added unavailable
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];
const RATE_PERIODS = ['night', 'week', 'month', 'year'];

// Zod Schema for Property Form - Refined v2
const propertyFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, { message: 'Property name must be at least 3 characters.' }).trim(),
  // Use nullish() to treat '' and undefined as null, default to null
  address_street: z.string().trim().nullish().default(null),
  address_city: z.string().trim().nullish().default(null),
  address_lga: z.string().trim().nullish().default(null),
  address_state: z.string().trim().nullish().default(null),
  type: z.string().min(1, { message: 'Please select a property type.' }),
  status: z.string().min(1, { message: 'Please select a status.' }).default('available'),
  amenities: z.string().optional().default(''), // Keep as string for form input
  // Use z.coerce to attempt conversion from string/number, then validate
  base_rate_amount: z.coerce.number()
      .positive({ message: "Rate must be positive" })
      .nullable() // Allows null
      .optional(), // Allows undefined input, output becomes number | null | undefined
  base_rate_currency: z.string().min(1, { message: 'Please select a currency.' }).default('NGN'),
  base_rate_per: z.string().min(1, { message: 'Please select a rate period.' }).default('night'),
  // Use nullish() for notes as well
  notes: z.string().trim().nullish().default(null),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  property?: Property | null;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export function PropertyForm({ property, onSubmitSuccess, onCancel }: PropertyFormProps) {
  const isEditMode = !!property;
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();

  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      id: undefined,
      name: '',
      address_street: null,
      address_city: null,
      address_lga: null,
      address_state: null,
      type: '',
      status: 'available',
      amenities: '',
      base_rate_amount: null, // Default to null explicitly
      base_rate_currency: 'NGN',
      base_rate_per: 'night',
      notes: null,
    },
  });

  // Populate form with property data in edit mode
  useEffect(() => {
      if (isEditMode && property) {
          console.log("Resetting form for Edit:", property);
          reset({
              id: property.id,
              name: property.name,
              address_street: property.address_street ?? null,
              address_city: property.address_city ?? null,
              address_lga: property.address_lga ?? null,
              address_state: property.address_state ?? null,
              type: property.type ?? '',
              status: property.status ?? 'available',
              amenities: property.amenities?.join(', ') ?? '',
              base_rate_amount: property.base_rate_amount ?? null,
              base_rate_currency: property.base_rate_currency ?? 'NGN',
              base_rate_per: property.base_rate_per ?? 'night',
              notes: property.notes ?? null,
          });
          setNewImageFiles([]);
          setDeletedImageIds([]);
      } else if (!isEditMode) {
          console.log("Resetting form for Create");
          reset({
              id: undefined, name: '', address_street: null, address_city: null,
              address_lga: null, address_state: null, type: '', status: 'available',
              amenities: '', base_rate_amount: null, base_rate_currency: 'NGN',
              base_rate_per: 'night', notes: null,
          });
          setNewImageFiles([]);
          setDeletedImageIds([]);
      }
  }, [property, isEditMode, reset]);

  const handleImageChange = useCallback((files: File[], deletedIds?: string[]) => {
      console.log("New files:", files);
      console.log("Deleted Image IDs:", deletedIds);
      setNewImageFiles(files);
      if (deletedIds) {
          setDeletedImageIds(deletedIds);
      }
  }, []);

  const onSubmit = async (values: PropertyFormValues) => {
    console.log("Form values on submit:", values);

    const amenitiesArray = values.amenities
        ? values.amenities.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    // Ensure base_rate_amount is number or null before sending
    const finalBaseRateAmount = values.base_rate_amount ? Number(values.base_rate_amount) : null;

    const basePayload = {
        name: values.name,
        address_street: values.address_street || null,
        address_city: values.address_city || null,
        address_lga: values.address_lga || null,
        address_state: values.address_state || null,
        type: values.type,
        status: values.status,
        amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
        base_rate_amount: finalBaseRateAmount, // Use processed value
        base_rate_currency: values.base_rate_currency,
        base_rate_per: values.base_rate_per,
        notes: values.notes || null,
    };

    console.log("Base payload:", basePayload);

    try {
      if (isEditMode && values.id) {
        console.log("Submitting Update...");
        const updatePayload: UpdatePropertyPayload = {
          ...basePayload,
          id: values.id,
          newImageFiles: newImageFiles,
          deletedImageIds: deletedImageIds,
        };
        console.log("Update Payload:", updatePayload);
        await updateMutation.mutateAsync(updatePayload);
        toast.success(`Property "${updatePayload.name}" updated.`);
      } else {
        console.log("Submitting Create...");
        const createPayload: CreatePropertyPayload = {
          ...basePayload,
          imageFiles: newImageFiles,
        };
        console.log("Create Payload:", createPayload);
        await createMutation.mutateAsync(createPayload);
        toast.success(`Property "${createPayload.name}" created.`);
      }
      onSubmitSuccess?.();
    } catch (error: any) {
      console.error("Property form submission error:", error);
      const message = error?.message || 'Failed to save property.';
      toast.error(message);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const initialImages: { id: string; url: string }[] = useMemo(() =>
      isEditMode && property?.images
          ? property.images.map((img: PropertyImage) => ({ id: img.id, url: img.image_url }))
          : [],
      [property, isEditMode]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Property Name</Label>
          <Input id="name" {...register('name')} disabled={isLoading} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="type">Property Type</Label>
            <Controller
                name="type"
                control={control}
                render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoading}>
                    <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                )}
            />
             {errors.type && <p className="text-xs text-red-600">{errors.type.message}</p>}
        </div>
      </div>

      {/* Address */}
      <fieldset className="space-y-4 border p-4 rounded-md">
          <legend className="text-sm font-medium px-1 -ml-1">Address</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="address_street">Street</Label>
                <Input id="address_street" {...register('address_street')} disabled={isLoading} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="address_city">City</Label>
                <Input id="address_city" {...register('address_city')} disabled={isLoading} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="address_lga">LGA</Label>
                <Input id="address_lga" {...register('address_lga')} disabled={isLoading} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="address_state">State</Label>
                <Input id="address_state" {...register('address_state')} disabled={isLoading} />
            </div>
          </div>
      </fieldset>

        {/* Rate & Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <Label htmlFor="base_rate_amount">Base Rate</Label>
                <Input id="base_rate_amount" type="number" step="any" {...register('base_rate_amount')} disabled={isLoading} />
                 {errors.base_rate_amount && <p className="text-xs text-red-600">{errors.base_rate_amount.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="base_rate_currency">Currency</Label>
                <Controller
                    name="base_rate_currency"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'NGN'} disabled={isLoading}>
                        <SelectTrigger> <SelectValue /> </SelectTrigger>
                        <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.base_rate_currency && <p className="text-xs text-red-600">{errors.base_rate_currency.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="base_rate_per">Per</Label>
                 <Controller
                    name="base_rate_per"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'night'} disabled={isLoading}>
                        <SelectTrigger> <SelectValue /> </SelectTrigger>
                        <SelectContent>
                        {RATE_PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
                 {errors.base_rate_per && <p className="text-xs text-red-600">{errors.base_rate_per.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                 <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'available'} disabled={isLoading}>
                        <SelectTrigger> <SelectValue /> </SelectTrigger>
                        <SelectContent>
                        {PROPERTY_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
                 {errors.status && <p className="text-xs text-red-600">{errors.status.message}</p>}
            </div>
        </div>


      {/* Amenities & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amenities">Amenities (comma-separated)</Label>
          <Input
            id="amenities"
            {...register('amenities')}
            disabled={isLoading}
            placeholder="e.g., WiFi, Pool, Air Conditioning"
           />
           {errors.amenities && <p className="text-xs text-red-600">{errors.amenities.message}</p>}
        </div>
         <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register('notes')} disabled={isLoading} />
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
          <Label>Images</Label>
          <ImageUpload
            initialFiles={initialImages}
            onFilesChange={handleImageChange}
            disabled={isLoading}
           />
      </div>


      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Save Changes' : 'Create Property'}
        </Button>
      </div>
    </form>
  );
}
