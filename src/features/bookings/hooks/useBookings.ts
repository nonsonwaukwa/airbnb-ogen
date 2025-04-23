import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type { Booking, CreateBookingPayload, UpdateBookingPayload, BookingImage } from '../types';
import { toast } from 'sonner';
// Comment out unused invoice imports
// import { useCreateInvoice } from '@/features/invoices/hooks/useInvoices'; 
// import type { CreateInvoicePayload } from '@/features/invoices/types';
// Comment out format if not used elsewhere
// import { format } from 'date-fns';

const BOOKING_QUERY_KEY = 'bookings';

// == Query Functions ==

/**
 * Fetches a list of bookings, potentially joining property name.
 * TODO: Implement filtering and sorting parameters.
 */
const getBookings = async (): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties ( id, name )
    `)
    .order('checkin_datetime', { ascending: false }); // Example order

  if (error) throw new Error(error.message);
  return (data as Booking[]) || []; // Cast needed because of join type inference
};

/**
 * Fetches a single booking by its ID, including property name.
 */
const getBooking = async (id: string): Promise<Booking | null> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties ( id, name ),
      booking_images(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  
  // Sort images by order if they exist
  if (data?.booking_images) {
    data.images = data.booking_images.sort((a: BookingImage, b: BookingImage) => a.order - b.order);
    delete data.booking_images; // Remove the raw booking_images after processing
  }
  
  return data as Booking | null;
};

// == Image Functions ==

/**
 * Handles image uploads to Supabase Storage.
 * Returns an array of URLs or paths to the uploaded images.
 */
const uploadBookingImages = async (bookingId: string, files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const filePath = `bookings/${bookingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('booking-images')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error(`Failed to upload image ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('booking-images')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    });

    return Promise.all(uploadPromises);
};

/**
 * Deletes images from Supabase Storage.
 */
const deleteBookingImages = async (imageUrls: string[]): Promise<void> => {
    if (!imageUrls || imageUrls.length === 0) return;

    // Extract file paths from URLs
    const filePaths = imageUrls.map(url => {
        try {
            const urlParts = new URL(url).pathname.split('/public/booking-images/');
            return urlParts[1];
        } catch (e) {
            console.error('Could not parse image URL for deletion:', url);
            return null;
        }
    }).filter(path => path !== null) as string[];

    if (filePaths.length === 0) return;

    const { error } = await supabase.storage
        .from('booking-images')
        .remove(filePaths);

    if (error) {
        console.error('Error deleting images:', error);
        toast.error(`Failed to delete some images: ${error.message}`);
    }
};

// == Mutation Functions ==

/**
 * Creates a new booking.
 */
const createBooking = async (payload: CreateBookingPayload): Promise<Booking> => {
  // Separate image files from the rest of the payload
  const { imageFiles, ...bookingData } = payload;

  // 1. Insert booking data
  const { data: newBooking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (bookingError) {
    console.error('Error creating booking:', bookingError);
    // Handle potential errors like duplicate booking_number if constraint exists
    if (bookingError.code === '23505' && bookingError.message.includes('bookings_booking_number_key')) {
      throw new Error('Failed to generate a unique booking number. Please try again.');
    }
    throw new Error(bookingError.message);
  }
  if (!newBooking) throw new Error('Failed to create booking, no data returned.');

  // 2. Upload images if any
  let uploadedImageUrls: string[] = [];
  if (imageFiles && imageFiles.length > 0) {
    try {
        uploadedImageUrls = await uploadBookingImages(newBooking.id, imageFiles);
    } catch (uploadError: any) {
        console.error('Image upload failed after creating booking:', uploadError);
        toast.error(`Booking created, but image upload failed: ${uploadError.message}. Please edit the booking to add images.`);
        // Continue without images
    }
  }

  // 3. Insert image records into booking_images table
  if (uploadedImageUrls.length > 0) {
    const imageRecords = uploadedImageUrls.map((url, index) => ({
      booking_id: newBooking.id,
      image_url: url,
      order: index,
    }));

    const { error: imageError } = await supabase
      .from('booking_images')
      .insert(imageRecords);

    if (imageError) {
      console.error('Error saving image records:', imageError);
      toast.error(`Booking created, but failed to link images: ${imageError.message}. Please edit the booking.`);
    }
  }

  return newBooking as Booking;
};

/**
 * Updates an existing booking.
 */
const updateBooking = async (payload: UpdateBookingPayload): Promise<Booking> => {
  const { id, newImageFiles, deletedImageIds, ...bookingData } = payload;

  // 1. Delete images marked for deletion (from storage and DB)
  if (deletedImageIds && deletedImageIds.length > 0) {
    // Fetch URLs to delete from storage
    const { data: imagesToDelete, error: fetchErr } = await supabase
        .from('booking_images')
        .select('id, image_url')
        .in('id', deletedImageIds);

    if (fetchErr) {
        console.error('Failed to fetch images for deletion:', fetchErr);
        toast.error('Could not fetch images to delete.');
    } else if (imagesToDelete && imagesToDelete.length > 0) {
        // Delete from DB first
        const { error: dbDeleteError } = await supabase
            .from('booking_images')
            .delete()
            .in('id', deletedImageIds);

        if (dbDeleteError) {
            console.error('Failed to delete image records from DB:', dbDeleteError);
            toast.error('Failed to delete image records.');
        } else {
            // If DB deletion successful, delete from storage
            const urlsToDelete = imagesToDelete.map(img => img.image_url);
            await deleteBookingImages(urlsToDelete);
        }
    }
  }

  // 2. Upload new images
  let uploadedImageUrls: string[] = [];
  if (newImageFiles && newImageFiles.length > 0) {
      try {
          uploadedImageUrls = await uploadBookingImages(id, newImageFiles);
      } catch (uploadError: any) {
          console.error('Failed to upload new images during update:', uploadError);
          toast.error(`Failed to upload new images: ${uploadError.message}`);
          // Continue with booking data update regardless
      }
  }

  // 3. Update booking data
  const { data: updatedBooking, error: bookingUpdateError } = await supabase
      .from('bookings')
      .update(bookingData)
      .eq('id', id)
      .select()
      .single();

  if (bookingUpdateError) {
      console.error('Error updating booking data:', bookingUpdateError);
      throw new Error(bookingUpdateError.message);
  }
  if (!updatedBooking) {
      throw new Error('Failed to update booking, no data returned.');
  }

  // 4. Insert new image records
  if (uploadedImageUrls.length > 0) {
      // Need to determine the order for new images (find max existing order)
      const { data: existingImages, error: orderError } = await supabase
          .from('booking_images')
          .select('order')
          .eq('booking_id', id)
          .order('order', { ascending: false })
          .limit(1);

      let nextOrder = 0;
      if (!orderError && existingImages && existingImages.length > 0) {
          nextOrder = existingImages[0].order + 1;
      }

      const newImageRecords = uploadedImageUrls.map((url, index) => ({
          booking_id: id,
          image_url: url,
          order: nextOrder + index,
      }));

      const { error: imageInsertError } = await supabase
          .from('booking_images')
          .insert(newImageRecords);

      if (imageInsertError) {
          console.error('Error saving new image records during update:', imageInsertError);
          toast.error(`Booking updated, but failed to link new images: ${imageInsertError.message}.`);
      }
  }

  return updatedBooking as Booking;
};

/**
 * Cancels a booking (sets status to cancelled and potentially updates payment status).
 */
const cancelBooking = async (id: string): Promise<Booking> => {
  // 1. Fetch the current booking to check its payment status
  const { data: currentBooking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, payment_status')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching booking before cancellation:', fetchError);
    throw new Error(`Could not fetch booking details: ${fetchError.message}`);
  }
  if (!currentBooking) {
    throw new Error('Booking not found.');
  }

  // 2. Determine the new payment status
  let newPaymentStatus = currentBooking.payment_status;
  if (currentBooking.payment_status === 'paid' || currentBooking.payment_status === 'partially_paid') {
    newPaymentStatus = 'refunded';
  } else if (currentBooking.payment_status === 'pending') {
    newPaymentStatus = 'cancelled';
  }
  // Otherwise, keep the current payment status (e.g., if already 'refunded' or 'cancelled')

  // 3. Update the booking
  const { data: cancelledBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ 
      booking_status: 'cancelled', 
      payment_status: newPaymentStatus 
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error cancelling booking:', updateError);
    throw new Error(updateError.message);
  }
  if (!cancelledBooking) {
    throw new Error('Failed to cancel booking, no data returned.');
  }

  return cancelledBooking as Booking;
};

/**
 * Deletes a booking and its associated images from storage.
 */
const deleteBooking = async (id: string): Promise<void> => {
    // 1. Get image URLs to delete from storage
    const { data: images, error: fetchErr } = await supabase
        .from('booking_images')
        .select('image_url')
        .eq('booking_id', id);

    if (fetchErr) {
        console.error('Could not fetch images before booking deletion:', fetchErr);
        // Proceed with booking deletion anyway
    }

    // 2. Delete the booking record (CASCADE should handle booking_images in DB)
    const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

    if (deleteError) {
        console.error('Error deleting booking:', deleteError);
        throw new Error(deleteError.message);
    }

    // 3. Delete images from storage using the helper
    if (images && images.length > 0) {
        const urlsToDelete = images.map(img => img.image_url);
        await deleteBookingImages(urlsToDelete);
    }
    
    // Also delete the storage folder itself
    const { error: folderError } = await supabase.storage
        .from('booking-images')
        .remove([`public/bookings/${id}`]);
     if (folderError) {
        console.warn(`Could not delete booking image folder public/bookings/${id}:`, folderError);
     }
};

// == React Query Hooks ==

export const useGetBookings = () => {
  return useQuery<Booking[], Error>({
    queryKey: [BOOKING_QUERY_KEY],
    queryFn: getBookings,
  });
};

export const useGetBooking = (id: string | null) => {
  return useQuery<Booking | null, Error>({
    queryKey: [BOOKING_QUERY_KEY, id],
    queryFn: () => (id ? getBooking(id) : Promise.resolve(null)),
    enabled: !!id,
  });
};

// Hook for Creating Bookings
export const useCreateBooking = () => {
    const queryClient = useQueryClient();
    // Comment out unused mutation hook variable
    // const createInvoiceMutation = useCreateInvoice(); 

    return useMutation<Booking, Error, CreateBookingPayload>({
        mutationFn: createBooking,
        onSuccess: (newBookingData) => {
            toast.success('Booking created successfully.');
            queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
            // Invalidate single booking query too if needed, though list invalidation might cover it
            // queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY, newBookingData.id] }); 

            // --- COMMENTED OUT Client-Side Automatic Invoice Creation Block --- 
            /*
            if (newBookingData.payment_status === 'paid') {
                const paidAmount = newBookingData.amount || 0;

                const invoicePayload: CreateInvoicePayload = {
                    booking_id: newBookingData.id,
                    customer_name: newBookingData.guest_name || '[Guest Name Missing]', 
                    customer_email: newBookingData.guest_email,
                    customer_phone: newBookingData.guest_phone,
                    tax_amount: 0,
                    discount_amount: 0,
                    customer_address_street: null,
                    customer_address_city: null,
                    customer_address_state: null,
                    customer_address_postal_code: null,
                    customer_address_country: null,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    line_items: [
                        {
                            description: `Booking for ${newBookingData.property?.name || 'Property'} (${formatDate(newBookingData.checkin_datetime)} - ${formatDate(newBookingData.checkout_datetime)})`,
                            quantity: 1,
                            unit_price: newBookingData.amount || 0, 
                        }
                    ],
                    currency: newBookingData.currency || 'NGN',
                    notes: `Auto-generated invoice for booking #${newBookingData.booking_number}`,
                    payment_method: newBookingData.payment_method,
                    payment_date: new Date().toISOString().split('T')[0],
                    status: 'paid',
                    amount_paid: paidAmount 
                };
                
                console.log('[useCreateBooking] Attempting to create invoice with payload:', JSON.stringify(invoicePayload, null, 2));

                createInvoiceMutation.mutate(invoicePayload, {
                    onSuccess: (createdInvoice) => {
                        console.log(`[Booking ${newBookingData.id}] Successfully created automatic invoice: ID ${createdInvoice.id}, Status: ${createdInvoice.status}`);
                        toast.info(`Invoice #${createdInvoice.invoice_number} automatically generated and marked as paid.`);
                    },
                    onError: (error) => {
                         console.error(`[Booking ${newBookingData.id}] FAILED to create automatic invoice: ${error.message}`);
                         toast.warning(`Booking created, but failed to automatically generate invoice. Please create it manually.`);
                    }
                });
            }
            */
        },
        onError: (error) => {
            toast.error(`Failed to create booking: ${error.message}`);
        },
    });
};

// Hook for Updating Bookings
export const useUpdateBooking = () => {
    const queryClient = useQueryClient();
     // Comment out unused mutation hook variable
    // const createInvoiceMutation = useCreateInvoice();

    return useMutation<Booking, Error, UpdateBookingPayload>({
        mutationFn: updateBooking,
        onSuccess: (updatedBookingData, variables) => {
            toast.success('Booking updated successfully.');
            queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY, updatedBookingData.id] });

            // --- COMMENTED OUT Client-Side Automatic Invoice Creation Block --- 
            /*
            if (updatedBookingData.payment_status === 'paid') {
                 const paidAmount = updatedBookingData.amount || 0;

                 const invoicePayload: CreateInvoicePayload = {
                    booking_id: updatedBookingData.id,
                    customer_name: updatedBookingData.guest_name || '[Guest Name Missing]', 
                    customer_email: updatedBookingData.guest_email,
                    customer_phone: updatedBookingData.guest_phone,
                    tax_amount: 0,
                    discount_amount: 0,
                    customer_address_street: null,
                    customer_address_city: null,
                    customer_address_state: null,
                    customer_address_postal_code: null,
                    customer_address_country: null,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    line_items: [
                        {
                            description: `Booking for ${updatedBookingData.property?.name || 'Property'} (${formatDate(updatedBookingData.checkin_datetime)} - ${formatDate(updatedBookingData.checkout_datetime)})`,
                            quantity: 1,
                            unit_price: updatedBookingData.amount || 0,
                        }
                    ],
                    currency: updatedBookingData.currency || 'NGN',
                    notes: `Auto-generated invoice for booking #${updatedBookingData.booking_number}`,
                    payment_method: updatedBookingData.payment_method,
                    payment_date: new Date().toISOString().split('T')[0],
                    status: 'paid',
                    amount_paid: paidAmount 
                 };
                 
                 console.log('[useUpdateBooking] Attempting to create invoice with payload:', JSON.stringify(invoicePayload, null, 2));

                 createInvoiceMutation.mutate(invoicePayload, {
                     onSuccess: (createdInvoice) => {
                         console.log(`[Booking ${updatedBookingData.id}] Successfully created automatic invoice on update: ID ${createdInvoice.id}, Status: ${createdInvoice.status}`);
                         toast.info(`Invoice #${createdInvoice.invoice_number} automatically generated and marked as paid.`);
                     },
                     onError: (error) => {
                         console.error(`[Booking ${updatedBookingData.id}] FAILED to create automatic invoice on update: ${error.message}`);
                         toast.warning(`Booking updated, but failed to automatically generate invoice. Please create it manually if needed.`);
                    }
                 });
            }
            */
        },
        onError: (error) => {
            toast.error(`Failed to update booking: ${error.message}`);
        },
    });
};

// Hook for cancelling a booking
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking, // Use the updated cancelBooking function
    onSuccess: (data) => {
      toast.success('Booking cancelled successfully.');
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY, data.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel booking: ${error.message}`);
    },
  });
};

// Hook for deleting a booking
export const useDeleteBooking = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteBooking,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: [BOOKING_QUERY_KEY, id] });
      toast.success('Booking deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete booking: ${error.message}`);
    },
  }); 
};

// Helper function definition
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
      // Attempt to handle both ISO strings and potentially date-only strings
    const date = new Date(dateString); 
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
        // Fallback for potential date-only strings (might need timezone adjustment)
        const dateOnlyDate = new Date(`${dateString}T00:00:00`);
         if (!isNaN(dateOnlyDate.getTime())) return format(dateOnlyDate, 'PP');
         else throw new Error('Invalid date format');
    } else {
         return format(date, 'PP'); // Example: Sep 14, 2024
    }
  } catch (error) {
    console.error('Error formatting date in booking hook:', dateString, error);
    return 'Invalid Date';
  }
}; 