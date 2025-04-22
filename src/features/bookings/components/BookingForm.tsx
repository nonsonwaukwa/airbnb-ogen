import React, { useState } from 'react';
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
import { toast } from 'sonner';

import { BookingImageUpload } from './BookingImageUpload';
import { useCreateBooking, useUpdateBooking } from '../hooks/useBookings';
import { useGetProperties } from '@/features/properties/hooks/useProperties';
import type { Booking, BookingImage, CreateBookingPayload, UpdateBookingPayload } from '../types';

const formSchema = z.object({
  guest_name: z.string().min(2, { message: "Guest name must be at least 2 characters." }),
  guest_email: z.string().email({ message: "Please enter a valid email address." }).nullable().optional(),
  guest_phone: z.string().nullable().optional(),
  property_id: z.string().min(1, { message: "Please select a property." }),
  platform: z.string().nullable().optional(),
  checkin_datetime: z.date({ required_error: "Please select a check-in date." }),
  checkout_datetime: z.date({ required_error: "Please select a check-out date." }),
  number_of_guests: z.coerce.number().min(1, { message: "Number of guests must be at least 1." }),
  amount: z.coerce.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  payment_status: z.string().min(1, { message: "Please select a payment status." }),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
  
  // Convert existing images to required format for ImageUpload component
  const existingImages = booking?.images?.map((img: BookingImage) => ({ 
    id: img.id, 
    url: img.image_url 
  })) || [];

  const { data: properties = [], isLoading: propertiesLoading } = useGetProperties();
  const { mutateAsync: createBooking, isPending: isCreating } = useCreateBooking();
  const { mutateAsync: updateBooking, isPending: isUpdating } = useUpdateBooking();
  
  const isPending = isCreating || isUpdating;

  // Create form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && booking ? {
      guest_name: booking.guest_name,
      guest_email: booking.guest_email || null,
      guest_phone: booking.guest_phone || null,
      property_id: booking.property_id || '',
      platform: booking.platform || null,
      checkin_datetime: booking.checkin_datetime ? new Date(booking.checkin_datetime) : undefined,
      checkout_datetime: booking.checkout_datetime ? new Date(booking.checkout_datetime) : undefined,
      number_of_guests: booking.number_of_guests,
      amount: booking.amount || null,
      currency: booking.currency || null,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method || null,
      notes: booking.notes || null,
    } : {
      guest_name: '',
      guest_email: null,
      guest_phone: null,
      property_id: '',
      platform: null,
      checkin_datetime: undefined,
      checkout_datetime: undefined,
      number_of_guests: 1,
      amount: null,
      currency: null,
      payment_status: 'pending',
      payment_method: null,
      notes: null,
    }
  });

  // Handle file changes from ImageUpload component
  const handleFilesChange = (newFiles: File[], deletedIds?: string[]) => {
    setImageFiles(newFiles);
    if (deletedIds) {
      setDeletedImageIds(deletedIds);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Convert Date objects to ISO strings and handle undefined values
      const basePayload: Omit<CreateBookingPayload, 'imageFiles'> = {
        guest_name: values.guest_name,
        guest_email: values.guest_email ?? null,
        guest_phone: values.guest_phone ?? null,
        property_id: values.property_id,
        platform: values.platform ?? null,
        checkin_datetime: values.checkin_datetime.toISOString(),
        checkout_datetime: values.checkout_datetime.toISOString(),
        number_of_guests: values.number_of_guests,
        amount: values.amount ?? null,
        currency: values.currency ?? null,
        payment_status: values.payment_status,
        payment_method: values.payment_method ?? null,
        notes: values.notes ?? null,
      };

      if (isEditMode && booking) {
        // Update booking
        const updatePayload: UpdateBookingPayload = {
          id: booking.id,
          ...basePayload,
          newImageFiles: imageFiles,
          deletedImageIds: deletedImageIds,
        };
        
        const updatedBooking = await updateBooking(updatePayload);
        
        if (onSuccess) {
          onSuccess(updatedBooking.id);
        } else {
          navigate(`/bookings/${updatedBooking.id}`);
        }
      } else {
        // Create new booking
        const createPayload: CreateBookingPayload = {
          ...basePayload,
          imageFiles,
        };
        
        const newBooking = await createBooking(createPayload);
        
        if (onSuccess) {
          onSuccess(newBooking.id);
        } else {
          navigate(`/bookings/${newBooking.id}`);
        }
      }
    } catch (error: any) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} booking: ${error.message || "An unexpected error occurred"}`);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property*</FormLabel>
                    <Select
                      disabled={propertiesLoading || isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                control={form.control}
                name="guest_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guest_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Platform</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Airbnb">Airbnb</SelectItem>
                        <SelectItem value="Booking.com">Booking.com</SelectItem>
                        <SelectItem value="Expedia">Expedia</SelectItem>
                        <SelectItem value="VRBO">VRBO</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number_of_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests*</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status*</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    defaultValue={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the booking"
                      className="min-h-[120px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <h3 className="mb-2 font-medium">Booking Images</h3>
              <BookingImageUpload
                initialFiles={existingImages}
                onFilesChange={handleFilesChange}
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate('/bookings');
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