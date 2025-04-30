import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { BookingImageUpload } from './BookingImageUpload';
import { useCreateBooking, useUpdateBooking } from '../hooks/useBookings';
import { useGetProperties } from '@/features/properties/hooks/useProperties';
import type { Booking, BookingImage, CreateBookingPayload, UpdateBookingPayload } from '../types';

// Define allowed statuses and payment statuses as const arrays for Zod enum
const ALLOWED_BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'] as const;
const ALLOWED_PAYMENT_STATUSES = ['pending', 'paid', 'partially_paid', 'refunded', 'cancelled'] as const;
const ALLOWED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const; // Add more if needed
const ALLOWED_PLATFORMS = ['Direct', 'Airbnb', 'Booking.com', 'Expedia', 'VRBO', 'Other'] as const;
const ALLOWED_PAYMENT_METHODS = ['card', 'bank_transfer', 'cash', 'paypal', 'other'] as const;

// Define a non-empty placeholder value for optional selects
const NONE_VALUE = "--none--";

const formSchema = z.object({
  guest_name: z.string().min(2, { message: "Guest name must be at least 2 characters." }),
  guest_email: z.string().email({ message: "Please enter a valid email address." }).nullable().optional().or(z.literal('')),
  guest_phone: z.string().nullable().optional().or(z.literal('')),
  property_id: z.string().uuid("Please select a property.").min(1, { message: "Please select a property." }), // Required
  platform: z.string().nullable().optional()
      .or(z.literal(NONE_VALUE)) // Allow placeholder
      .transform(val => val === NONE_VALUE ? null : val) // Transform to null
      .refine(val => val === null || ALLOWED_PLATFORMS.includes(val as typeof ALLOWED_PLATFORMS[number]), { message: "Invalid platform" }), // Optional validation
  checkin_datetime: z.date({ required_error: "Please select a check-in date." }),
  checkout_datetime: z.date({ required_error: "Please select a check-out date." }),
  number_of_guests: z.coerce.number().int("Must be a whole number.").min(1, { message: "Number of guests must be at least 1." }),
  amount: z.coerce.number().min(0, "Amount cannot be negative.").nullable().optional(),
  currency: z.string().nullable().optional()
      .or(z.literal(NONE_VALUE)) // Allow placeholder
      .transform(val => val === NONE_VALUE ? null : val) // Transform to null
      .refine(val => val === null || ALLOWED_CURRENCIES.includes(val as typeof ALLOWED_CURRENCIES[number]), { message: "Invalid currency" }), // Optional validation
  payment_status: z.enum(ALLOWED_PAYMENT_STATUSES),
  payment_method: z.string().nullable().optional()
      .or(z.literal(NONE_VALUE)) // Allow placeholder
      .transform(val => val === NONE_VALUE ? null : val) // Transform to null
      .refine(val => val === null || ALLOWED_PAYMENT_METHODS.includes(val as typeof ALLOWED_PAYMENT_METHODS[number]), { message: "Invalid payment method" }), // Optional validation
  notes: z.string().nullable().optional().or(z.literal('')),
  booking_status: z.enum(ALLOWED_BOOKING_STATUSES),
}).refine(data => data.checkout_datetime > data.checkin_datetime, {
  message: "Check-out date must be after check-in date.",
  path: ["checkout_datetime"],
});

interface BookingFormProps {
  booking?: Booking;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
  isEditMode?: boolean;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  booking,
  onSuccess,
  onCancel,
  isEditMode = false
}) => {
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const existingImages = booking?.images?.map((img: BookingImage) => ({
    id: img.id,
    url: img.image_url
  })) || [];

  const { data: properties = [], isLoading: propertiesLoading } = useGetProperties();
  const { mutateAsync: createBooking, isPending: isCreating } = useCreateBooking();
  const { mutateAsync: updateBooking, isPending: isUpdating } = useUpdateBooking();

  const isPending = isCreating || isUpdating;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guest_name: booking?.guest_name ?? '',
      guest_email: booking?.guest_email ?? '',
      guest_phone: booking?.guest_phone ?? '',
      property_id: booking?.property_id ?? '', // Required, but default to '' for initial state
      platform: booking?.platform ?? null, // Store null internally
      checkin_datetime: booking?.checkin_datetime ? new Date(booking.checkin_datetime) : undefined,
      checkout_datetime: booking?.checkout_datetime ? new Date(booking.checkout_datetime) : undefined,
      number_of_guests: booking?.number_of_guests ?? 1,
      amount: booking?.amount ?? null,
      currency: booking?.currency ?? null, // Store null internally
      payment_status: (booking?.payment_status ?? 'pending') as 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'cancelled',
      payment_method: booking?.payment_method ?? null, // Store null internally
      notes: booking?.notes ?? '',
      booking_status: (booking?.booking_status ?? 'pending') as 'pending' | 'cancelled' | 'confirmed' | 'completed' | 'no-show',
    }
  });

   useEffect(() => {
    if (isEditMode && booking) {
        form.reset({
            guest_name: booking.guest_name ?? '',
            guest_email: booking.guest_email ?? '',
            guest_phone: booking.guest_phone ?? '',
            property_id: booking.property_id ?? '',
            platform: booking.platform ?? null,
            checkin_datetime: booking.checkin_datetime ? new Date(booking.checkin_datetime) : undefined,
            checkout_datetime: booking.checkout_datetime ? new Date(booking.checkout_datetime) : undefined,
            number_of_guests: booking.number_of_guests ?? 1,
            amount: booking.amount ?? null,
            currency: booking.currency ?? null,
            payment_status: booking.payment_status as "pending" | "paid" | "partially_paid" | "refunded" | "cancelled" ?? 'pending',
            payment_method: booking.payment_method ?? null,
            notes: booking.notes ?? '',
            booking_status: (booking.booking_status ?? 'pending') as 'pending' | 'cancelled' | 'confirmed' | 'completed' | 'no-show',
        });
    } else if (!isEditMode) {
         form.reset({
            guest_name: '', guest_email: '', guest_phone: '', property_id: '', platform: null,
            checkin_datetime: undefined, checkout_datetime: undefined, number_of_guests: 1,
            amount: null, currency: null, payment_status: 'pending', payment_method: null, // Use null
            notes: '', booking_status: 'pending'
         });
    }
   }, [booking, isEditMode, form]);

  const handleFilesChange = (newFiles: File[], deletedIds?: string[]) => {
    setImageFiles(newFiles);
    if (deletedIds) {
      setDeletedImageIds(deletedIds);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Zod transform handles converting NONE_VALUE back to null
      // Ensure empty strings from text inputs become null if desired by DB
      const basePayload = {
        ...values, // Start with validated values
        guest_email: values.guest_email || null,
        guest_phone: values.guest_phone || null,
        platform: values.platform, // Already null from transform
        currency: values.currency, // Already null from transform
        payment_method: values.payment_method, // Already null from transform
        notes: values.notes || null,
        checkin_datetime: values.checkin_datetime.toISOString(), // Convert dates
        checkout_datetime: values.checkout_datetime.toISOString(),
      };

      if (isEditMode && booking) {
        const updatePayload: UpdateBookingPayload = {
          id: booking.id,
          ...basePayload,
          newImageFiles: imageFiles,
          deletedImageIds: deletedImageIds,
        };
        const updatedBooking = await updateBooking(updatePayload);
        if (onSuccess) onSuccess(updatedBooking.id);
        else navigate(`/bookings/${updatedBooking.id}`);
      } else {
        const createPayload: CreateBookingPayload = {
          ...basePayload,
          imageFiles,
          platform: basePayload.platform ?? null,
          currency: basePayload.currency ?? null,
          payment_method: basePayload.payment_method ?? null,
          amount: basePayload.amount ?? null,
          booking_status: basePayload.booking_status ?? 'pending',
          payment_status: basePayload.payment_status ?? 'pending'
        };
        const newBooking = await createBooking(createPayload);
        if (onSuccess) onSuccess(newBooking.id);
        else navigate(`/bookings`);
      }
    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} booking:`, error);
      // Toast handled by hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Booking' : 'Create New Booking'}</CardTitle>
        <CardDescription>
          {isEditMode
            ? 'Update booking information and images'
            : 'Fill in the details to create a new booking'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Guest Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any} // <-- Added 'as any'
                name="guest_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Guest name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="guest_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="guest_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="number_of_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests*</FormLabel>
                    <FormControl>
                       {/* Ensure value is controlled, default to 1 */}
                      <Input type="number" min={1} {...field} value={field.value ?? 1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

             {/* Booking Details */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property*</FormLabel>
                    <Select
                      disabled={propertiesLoading || isPending}
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any} // <-- Added 'as any'
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Platform</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
                      value={field.value ?? NONE_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform (Optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value={NONE_VALUE}>-- None --</SelectItem>
                         {ALLOWED_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
             </div>

             {/* Dates */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="checkin_datetime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-in Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal justify-start",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control as any} // <-- Added 'as any'
                name="checkout_datetime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-out Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal justify-start",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                             <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date <= (form.getValues('checkin_datetime') || new Date(new Date().setHours(0, 0, 0, 0)))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
             </div>

            {/* Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control as any} // <-- Added 'as any'
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" placeholder="e.g., 50000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any} // <-- Added 'as any'
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
                      value={field.value ?? NONE_VALUE} // Use placeholder value for null
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value={NONE_VALUE}>-- None --</SelectItem>
                         {ALLOWED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any} // <-- Added 'as any'
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status*</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      value={field.value} // Should have default 'pending'
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALLOWED_PAYMENT_STATUSES.map(status => (
                           <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control as any} // <-- Added 'as any'
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    disabled={isPending}
                    onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
                    value={field.value ?? NONE_VALUE} // Use placeholder value for null
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method (Optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value={NONE_VALUE}>-- None --</SelectItem>
                       {ALLOWED_PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Booking Status (Only Editable in Edit Mode) */}
             <FormField
                control={form.control as any} // <-- Added 'as any'
                name="booking_status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Booking Status*</FormLabel>
                    <Select
                    // Disable if not editing, or based on workflow rules
                    disabled={!isEditMode || isPending}
                    onValueChange={field.onChange}
                    value={field.value} // Should have value
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                            {ALLOWED_BOOKING_STATUSES.map(status => (
                            <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </SelectItem>
                            ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />


            {/* Notes */}
            <FormField
              control={form.control as any} // <-- Added 'as any'
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the booking"
                      className="min-h-[100px]"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div>
              <h3 className="mb-2 font-medium text-sm">Booking Images</h3>
              <BookingImageUpload
                initialFiles={existingImages} // Pass existing images if editing
                onFilesChange={handleFilesChange}
                disabled={isPending}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate(isEditMode ? `/bookings/${booking?.id}` : '/bookings');
                  }
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode ? 'Updating...' : 'Creating...'
                  : isEditMode ? 'Update Booking' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
