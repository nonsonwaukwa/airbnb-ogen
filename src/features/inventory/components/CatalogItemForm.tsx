import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import type { CatalogItem, CreateCatalogItemDTO } from '../types';
import { Skeleton } from '@/components/ui/skeleton';

// Define allowed currencies (adjust as needed)
const ALLOWED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;

// Simplify schema: Remove preprocess/transform, use basic types + refine
// Use string for numbers, handle nulls/empty strings for selects
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(), // Optional string, handle null/undefined later
  category: z.string().min(1, 'Category is required'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  // Use string for number inputs, refine for numeric check
  low_stock_threshold: z.string()
    .refine(val => val === '' || !isNaN(parseFloat(val)), { message: "Must be a valid number" })
    .optional(),
  // Use string for optional UUID, allow empty string for "None"
  preferred_supplier_id: z.string().uuid().or(z.literal('')).optional(),
  // Use string for number inputs, refine for numeric check >= 1
  reorder_quantity: z.string()
     .refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 1), { message: "Must be a valid number >= 1" })
    .optional(),
  // Use string for optional number inputs
  last_purchase_price: z.string()
     .refine(val => val === '' || !isNaN(parseFloat(val)), { message: "Must be a valid number" })
    .optional(),
   // Use string for optional currency, allow empty string for "None"
  currency: z.string()
    .refine(val => val === '' || ALLOWED_CURRENCIES.includes(val as typeof ALLOWED_CURRENCIES[number]), {
      message: "Invalid currency selected",
    })
    .optional(),
});

// Define the type based on the *simplified* schema
type CatalogFormValues = z.infer<typeof formSchema>;

type CatalogItemFormProps = {
  defaultValues?: Partial<CatalogItem>;
  onSubmit: (data: CreateCatalogItemDTO) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
};

export function CatalogItemForm({ defaultValues, onSubmit, isSubmitting, onCancel }: CatalogItemFormProps) {
  const { data: suppliers, isLoading: isLoadingSuppliers } = useGetSuppliers();

  // Use the CatalogFormValues type
  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(formSchema),
    // Default values match the simplified schema (strings, empty strings)
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '', // Default optional string to ''
      category: defaultValues?.category ?? '',
      unit_of_measure: defaultValues?.unit_of_measure ?? '',
      // Numbers as strings, default to string representation or empty string
      low_stock_threshold: defaultValues?.low_stock_threshold?.toString() ?? '0',
      reorder_quantity: defaultValues?.reorder_quantity?.toString() ?? '1',
      last_purchase_price: defaultValues?.last_purchase_price?.toString() ?? '',
      // Use empty string '' for "None"/null select defaults
      preferred_supplier_id: defaultValues?.preferred_supplier_id ?? '',
      currency: defaultValues?.currency ?? '',
    },
  });

  // Transform data before submitting
  const handleFormSubmit = (data: CatalogFormValues) => {
    // Explicitly cast potentially undefined optional string fields to string | null for the DTO
    const descriptionValue: string | null = data.description ?? null;
    const preferredSupplierIdValue: string | null = data.preferred_supplier_id === '' ? null : (data.preferred_supplier_id ?? null);
    const currencyValue: string | null = data.currency === '' ? null : (data.currency ?? null);

    const transformedData: CreateCatalogItemDTO = {
       name: data.name,
       category: data.category,
       unit_of_measure: data.unit_of_measure,
       description: descriptionValue,
       // Transform numbers from strings, handle defaults/nulls
       low_stock_threshold: data.low_stock_threshold ? parseFloat(data.low_stock_threshold) : 0,
       reorder_quantity: data.reorder_quantity ? parseFloat(data.reorder_quantity) : 1,
       last_purchase_price: data.last_purchase_price ? parseFloat(data.last_purchase_price) : null,
       preferred_supplier_id: preferredSupplierIdValue,
       currency: currencyValue,
     };
    onSubmit(transformedData);
  };


  return (
    <Form {...form}>
      {/* Ensure className has correct spacing */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Standard Pillow" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                {/* Value is string | undefined, default controlled value to '' */}
                <Textarea placeholder="Optional: Add details about the item..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Linens, Toiletries, Cleaning" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit of Measure */}
        <FormField
          control={form.control}
          name="unit_of_measure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit of Measure *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., piece, bottle, roll, kg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price & Currency Fields - Input value is string | undefined */} 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="last_purchase_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Purchase Price *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="e.g., 1500.50"
                    {...field}
                    value={field.value ?? ''} // Controlled value is string
                    // No manual onChange conversion needed
                  />
                </FormControl>
                 <FormDescription>Optional: Used for auto-PO generation.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency *</FormLabel>
                 <Select
                    // Check for placeholder string, set form value to ''
                    onValueChange={(value) => field.onChange(value === "--none--" ? "" : value)}
                    value={field.value ?? ''} // Controlled value is string
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Select Currency --" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {/* Use non-empty placeholder value */}
                      <SelectItem value="--none--">-- None --</SelectItem>
                      {ALLOWED_CURRENCIES.map(curr => (
                         <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                 <FormDescription>Optional: Currency for the price.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Threshold & Reorder Qty Fields - Input value is string | undefined */} 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low Stock Threshold *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g., 5"
                    {...field}
                    value={field.value ?? ''} // Controlled value is string
                    // No manual onChange conversion needed
                  />
                </FormControl>
                 <FormDescription>Notify when stock reaches this level.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reorder_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Quantity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g., 10"
                    {...field}
                     value={field.value ?? ''} // Controlled value is string
                     // No manual onChange conversion needed
                  />
                </FormControl>
                 <FormDescription>Default quantity for auto-PO.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Preferred Supplier - Value is string | undefined */}
        <FormField
          control={form.control}
          name="preferred_supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Supplier *</FormLabel>
              <Select
                 // Check for placeholder string, set form value to ''
                onValueChange={(value) => field.onChange(value === "--none--" ? "" : value)}
                value={field.value ?? ''} // Controlled value is string
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select a supplier --" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                   {/* Use non-empty placeholder value */}
                  <SelectItem value="--none--">-- None --</SelectItem>
                  {isLoadingSuppliers ? (
                     <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
                  ) : (
                    suppliers?.map((supplier) => (
                      supplier?.id ? (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ) : null
                    ))
                  )}
                </SelectContent>
              </Select>
               <FormDescription>Optional: Default supplier for reordering.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                 </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (defaultValues?.id ? 'Update Item' : 'Create Item')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
