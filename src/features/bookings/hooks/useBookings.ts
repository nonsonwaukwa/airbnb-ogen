import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient'; // Ensure correct path
import type { Booking, BookingStatus, CreateBookingPayload, UpdateBookingPayload, BookingImage, PaymentStatus } from '../types'; // Ensure correct path
import { toast } from 'sonner';
// Comment out format if not used elsewhere
// import { format } from 'date-fns';



// Query key factory (using 'bookings' as the primary key)
const bookingKeys = {
    all: ['bookings'] as const,
    lists: () => [...bookingKeys.all, 'list'] as const,
    list: (filters?: any) => [...bookingKeys.lists(), filters || {}] as const,
    details: () => [...bookingKeys.all, 'detail'] as const,
    detail: (id: string) => [...bookingKeys.details(), id] as const,
    images: (bookingId: string) => [...bookingKeys.detail(bookingId), 'images'] as const,
    audit: (bookingId: string) => [...bookingKeys.detail(bookingId), 'audit'] as const,
};



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
 * Fetches a single booking by its ID, including property name and sorted images.
 */
const getBooking = async (id: string): Promise<Booking | null> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties ( id, name ),
      images:booking_images(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error("Error fetching single booking:", error);
    throw new Error(error.message);
  }
  
  // Type assertion needed because Supabase client doesn't know about the alias
  const bookingData = data as any as (Booking | null);

  // Sort images by order if they exist and the array is present
  if (bookingData?.images && Array.isArray(bookingData.images)) {
    // Ensure 'order' exists and is a number before sorting
    bookingData.images.sort((a: BookingImage, b: BookingImage) => (a.order ?? 0) - (b.order ?? 0));
  } else if (bookingData) { // Ensure data exists before assigning empty array
      bookingData.images = []; // Ensure images is always an array
  }
  
  return bookingData;
};


// == Image Functions ==

/**
 * Handles image uploads to Supabase Storage.
 * Returns an array of objects containing URL and path to the uploaded images.
 */
const uploadBookingImages = async (bookingId: string, files: File[]): Promise<{url: string, path: string}[]> => { // Return URL and path
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        // Consistent path structure
        const filePath = `public/bookings/${bookingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('booking-images') // Bucket name
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error(`Failed to upload image ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('booking-images') // Bucket name
            .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
             throw new Error(`Failed to get public URL for ${filePath}`);
        }

        return { url: urlData.publicUrl, path: filePath }; // Return both URL and path
    });

    return Promise.all(uploadPromises);
};

/**
 * Deletes images from Supabase Storage.
 */
const deleteBookingImages = async (imageUrls: string[]): Promise<void> => {
    if (!imageUrls || imageUrls.length === 0) return;

    // Extract file paths from URLs - needs adjustment based on your actual public URL structure
    const filePaths = imageUrls.map(url => {
        try {
             // Example: Assumes URL like https://<project_ref>.supabase.co/storage/v1/object/public/booking-images/public/bookings/<booking_id>/<filename>
            const urlObject = new URL(url);
            // Find the part after the bucket name in the path
            const pathParts = urlObject.pathname.split('/booking-images/');
            if (pathParts.length > 1) {
                 // Decode URI component in case of special characters in filename
                return decodeURIComponent(pathParts[1]);
            }
            console.warn('Could not extract path from image URL:', url);
            return null;
        } catch (e) {
            console.error('Could not parse image URL for deletion:', url, e);
            return null;
        }
    }).filter(path => path !== null) as string[];

    if (filePaths.length === 0) {
        console.log("No valid file paths found to delete from storage.");
        return;
    }
    console.log("Attempting to delete from storage:", filePaths);

    const { error } = await supabase.storage
        .from('booking-images') // Bucket name
        .remove(filePaths);

    if (error) {
        console.error('Error deleting images from storage:', error);
        // Don't throw necessarily, but notify user
        toast.error(`Failed to delete some images from storage: ${error.message}`);
    } else {
        console.log("Successfully deleted images from storage:", filePaths);
    }
};


// == Backend Action Functions (RPC Calls & Direct DB) ==

/**
 * Creates a new booking record and handles image uploads/linking.
 */
const createBookingDB = async (payload: CreateBookingPayload): Promise<Booking> => {
  const { imageFiles, ...bookingData } = payload;

  // 1. Insert booking data
  const { data: newBookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select(`*, property:properties ( id, name )`) // Select necessary fields
    .single();

  if (bookingError) {
    console.error('Error creating booking:', bookingError);
    if (bookingError.code === '23505' && bookingError.message.includes('bookings_booking_number_key')) {
      throw new Error('Failed to generate a unique booking number. Please try again.');
    }
    throw new Error(bookingError.message);
  }
  if (!newBookingData) throw new Error('Failed to create booking, no data returned.');
  
  // Ensure the returned type matches Booking, especially the 'images' field
  const newBooking = { ...newBookingData, images: [] } as Booking;

  // 2. Upload images if any were provided
  let uploadedImageData: { url: string, path: string }[] = [];
  if (imageFiles && imageFiles.length > 0) {
      try {
          uploadedImageData = await uploadBookingImages(newBooking.id, imageFiles);
      } catch (uploadError: any) {
          console.error("Image upload failed after booking creation:", uploadError);
          toast.error(`Booking created, but image upload failed: ${uploadError.message}`);
          return newBooking as Booking;
      }
  }

  // 3. Insert image references into booking_images table
  if (uploadedImageData.length > 0) {
      // Determine starting order
      const { data: existingImages, error: orderError } = await supabase
          .from('booking_images')
          .select('order')
          .eq('booking_id', newBooking.id)
          .order('order', { ascending: false })
          .limit(1);

       if (orderError) console.error('Could not determine image order.');
       const startOrder = existingImages?.[0]?.order + 1 || 0;

      const imageRecords = uploadedImageData.map((imgData, index) => ({
          booking_id: newBooking.id,
          image_url: imgData.url,
          order: startOrder + index
      }));

      const { error: imageInsertError } = await supabase
          .from('booking_images')
          .insert(imageRecords);

      if (imageInsertError) {
          console.error('Failed to insert image records:', imageInsertError);
          await deleteBookingImages(uploadedImageData.map(d => d.url));
          toast.error('Booking created, but failed to save image references.');
          return newBooking as Booking;
      }
      // Add uploaded images to the returned booking object
      newBooking.images = imageRecords as BookingImage[];
  }


  return newBooking;
};


/**
 * Updates an existing booking, including handling image additions/deletions.
 */
const updateBookingDB = async (payload: UpdateBookingPayload): Promise<Booking> => {
    const { id, newImageFiles, deletedImageIds, ...bookingData } = payload;

    // 1. Delete images marked for deletion
    if (deletedImageIds && deletedImageIds.length > 0) {
        const { data: imagesToDelete, error: fetchErr } = await supabase
            .from('booking_images')
            .select('id, image_url')
            .in('id', deletedImageIds);

         if (fetchErr) console.error("Failed to fetch URLs for image deletion:", fetchErr);

        const { error: dbDeleteError } = await supabase
            .from('booking_images')
            .delete()
            .in('id', deletedImageIds);

        if (dbDeleteError) {
             console.error("Failed to delete image records:", dbDeleteError);
             toast.error("Failed to delete some images from database.");
        }

        if (imagesToDelete && imagesToDelete.length > 0) {
            await deleteBookingImages(imagesToDelete.map(img => img.image_url));
        }
    }

    // 2. Upload new images
    let newUploadedImageData: { url: string, path: string }[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
        try {
            newUploadedImageData = await uploadBookingImages(id, newImageFiles);
        } catch (uploadError: any) {
            console.error("Image upload failed during booking update:", uploadError);
            toast.error(`Booking update proceeding, but image upload failed: ${uploadError.message}`);
        }
    }

    // 3. Insert new image references
    if (newUploadedImageData.length > 0) {
         const { data: existingImages, error: orderError } = await supabase
            .from('booking_images')
            .select('order')
            .eq('booking_id', id)
            .order('order', { ascending: false })
            .limit(1);

        if (orderError) console.error('Could not determine image order for update.');
        const startOrder = existingImages?.[0]?.order + 1 || 0;

        const imageRecords = newUploadedImageData.map((imgData, index) => ({
            booking_id: id,
            image_url: imgData.url,
            order: startOrder + index
        }));

        const { error: imageInsertError } = await supabase
            .from('booking_images')
            .insert(imageRecords);

        if (imageInsertError) {
            console.error('Failed to insert new image records:', imageInsertError);
            await deleteBookingImages(newUploadedImageData.map(d => d.url));
            toast.error('Booking update proceeding, but failed to save new image references.');
        }
    }

    // 4. Update the main booking record
     const { data: updatedBookingData, error: bookingUpdateError } = await supabase
         .from('bookings')
         .update(bookingData)
         .eq('id', id)
         .select(`*, property:properties(id, name), images:booking_images(*)`) 
         .single();
 
     if (bookingUpdateError) {
         console.error('Error updating booking:', bookingUpdateError);
         throw new Error(bookingUpdateError.message);
     }
      if (!updatedBookingData) throw new Error('Failed to update booking, no data returned.');
      
      // Type assertion and ensure images is an array
      const updatedBooking = { ...updatedBookingData, images: updatedBookingData.images ?? [] } as any as Booking;
 
      // Sort images again
      if (updatedBooking?.images && Array.isArray(updatedBooking.images)) {
         updatedBooking.images.sort((a: BookingImage, b: BookingImage) => (a.order ?? 0) - (b.order ?? 0));
      } 
 
     return updatedBooking;
 };


/**
 * Calls the cancel_booking RPC function.
 */
const cancelBookingRPC = async (id: string): Promise<void> => {
    console.log(`[cancelBookingRPC] Calling RPC for id: ${id}`); // Log RPC call
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: id });
    if (error) {
        console.error('RPC Error cancel_booking:', error);
        throw new Error(error.message || 'Failed to cancel booking via RPC.');
    }
     console.log(`[cancelBookingRPC] RPC call successful for id: ${id}`);
};

/**
 * Calls the mark_booking_paid RPC function.
 */
const markBookingPaidRPC = async (id: string): Promise<void> => {
     console.log(`[markBookingPaidRPC] Calling RPC for id: ${id}`); // Log RPC call
    const { error } = await supabase.rpc('mark_booking_paid', { p_booking_id: id });
    if (error) {
        console.error('RPC Error mark_booking_paid:', error);
        throw new Error(error.message || 'Failed to mark booking as paid via RPC.');
    }
     console.log(`[markBookingPaidRPC] RPC call successful for id: ${id}`);
};

/**
 * Calls the update_booking_status RPC function.
 */
const updateBookingStatusRPC = async (id: string, newStatus: BookingStatus): Promise<void> => {
    console.log(`[updateBookingStatusRPC] Calling RPC for id: ${id}, newStatus: ${newStatus}`); // Log RPC call
    const { error } = await supabase.rpc('update_booking_status', {
        p_booking_id: id,
        p_new_status: newStatus
    });
    if (error) {
        console.error('RPC Error update_booking_status:', error);
        throw new Error(error.message || 'Failed to update booking status via RPC.');
    }
     console.log(`[updateBookingStatusRPC] RPC call successful for id: ${id}, status: ${newStatus}`);
};


/**
 * Deletes a booking record directly.
 */
const deleteBookingDB = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
      console.error('Error deleting booking:', error);
      throw new Error(error.message || 'Failed to delete booking.');
  }
};

// == React Query Hooks ==

// --- Read Hooks ---
export const useGetBookings = () => {
  return useQuery<Booking[], Error>({
    queryKey: bookingKeys.lists(),
    queryFn: getBookings,
  });
};

export const useGetBooking = (id: string | null | undefined) => {
  return useQuery<Booking | null, Error>({
    queryKey: bookingKeys.detail(id as string),
    queryFn: () => getBooking(id!),
    enabled: !!id,
  });
};

// --- Create Hook ---
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, CreateBookingPayload>({
    mutationFn: createBookingDB,
    onSuccess: () => {
      toast.success('Booking created successfully!');
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create booking: ${error.message}`);
    },
  });
};

// --- Update Hooks ---

// Combined update hook for details and images
export const useUpdateBooking = () => {
    const queryClient = useQueryClient();

    return useMutation<Booking, Error, UpdateBookingPayload>({
        mutationFn: updateBookingDB,
        onSuccess: (updatedBooking) => {
            toast.success('Booking updated successfully!');
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(updatedBooking.id) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
        },
        onError: (error) => {
            toast.error(`Update failed: ${error.message}`);
        },
    });
};


// Hook specifically for cancelling (uses RPC)
export const useCancelBookingRPC = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string }>({
        mutationFn: (variables) => cancelBookingRPC(variables.id),
        onSuccess: (_, variables) => {
            toast.success('Booking cancelled successfully!');
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
        },
        onError: (error) => {
            toast.error(`Cancellation failed: ${error.message}`);
        },
    });
};

// Hook specifically for marking paid (uses RPC)
export const useMarkBookingPaid = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string }>({
        mutationFn: (variables) => markBookingPaidRPC(variables.id),
        onSuccess: (_, variables) => {
            toast.success('Booking marked as paid!');
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
        },
        onError: (error) => {
            toast.error(`Failed to mark as paid: ${error.message}`);
        },
    });
};

// Hook specifically for updating status (uses RPC)
export const useUpdateBookingStatus = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string; newStatus: BookingStatus }>({
        mutationFn: (variables) => {
             // *** ADDED CONSOLE LOG HERE ***
             console.log('[useUpdateBookingStatus] Calling mutationFn with:', variables);
             // Ensure both id and newStatus are passed to the RPC helper
             if (!variables.id || !variables.newStatus) {
                 const errorMsg = `Missing required parameters: id=${variables.id}, newStatus=${variables.newStatus}`;
                 console.error(errorMsg);
                 toast.error(errorMsg); // Show error to user
                 throw new Error(errorMsg); // Prevent RPC call
             }
             return updateBookingStatusRPC(variables.id, variables.newStatus);
        },
        onSuccess: (_, variables) => {
            toast.success(`Booking status updated to ${variables.newStatus}!`)
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
        },
        onError: (error) => {
            // Log the detailed error object
            console.error('[useUpdateBookingStatus] Mutation onError:', error);
            toast.error(`Status update failed: ${error.message}`);
        },
    });
};

// --- Audit Log Hooks ---


// Hook to fetch audit logs
const getBookingAuditLog = async (bookingId: string): Promise<any[]> => { // Replace 'any' with AuditLog type
    const { data, error } = await supabase
        .from('booking_audit_log') // Ensure this table exists
        .select('*, user:profiles(full_name)')
        .eq('booking_id', bookingId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching audit log:', error);
        throw new Error(error.message || 'Failed to fetch audit log.');
    }
    return data || [];
};

export const useGetBookingAuditLog = (bookingId: string | null | undefined) => {
    return useQuery<any[], Error>({
        queryKey: bookingKeys.audit(bookingId as string), // Use factory, enable only when defined
        queryFn: () => getBookingAuditLog(bookingId!),
        enabled: !!bookingId,
    });
};


// --- Delete Hook (Uses direct DB call) ---
export const useDeleteBooking = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteBookingDB, // Calls the direct delete function
    onSuccess: (_, id) => {
      toast.success('Booking deleted successfully!');
      queryClient.removeQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
    },
  });
};

// Utility hook for uploading images
export const useUploadBookingImages = () => {
    const queryClient = useQueryClient();
    return useMutation<
        void,
        Error,
        { bookingId: string; files: File[] } // Simplified args
    >({
        mutationFn: async ({ bookingId, files }) => {
            const uploadedUrlsData = await uploadBookingImages(bookingId, files);
            if (uploadedUrlsData.length === 0) return;

            const { data: existingImages, error: orderError } = await supabase
                .from('booking_images')
                .select('order')
                .eq('booking_id', bookingId)
                .order('order', { ascending: false })
                .limit(1);

            if (orderError) throw new Error('Could not determine image order.');
            const startOrder = existingImages?.[0]?.order + 1 || 0;

            const imageRecords = uploadedUrlsData.map((imgData, index) => ({
                booking_id: bookingId,
                image_url: imgData.url,
                order: startOrder + index,
            }));

            const { error: imageInsertError } = await supabase
                .from('booking_images')
                .insert(imageRecords);

            if (imageInsertError) {
                console.error('Failed to insert image records:', imageInsertError);
                await deleteBookingImages(uploadedUrlsData.map(d => d.url));
                throw new Error('Failed to save image references to database.');
            }
        },
        onSuccess: (_, variables) => {
            toast.success('Images uploaded successfully!');
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.bookingId) });
        },
        onError: (error) => {
            toast.error(`Image upload failed: ${error.message}`);
        }
    });
};

// Utility hook for deleting images
export const useDeleteBookingImages = () => {
    const queryClient = useQueryClient();
    return useMutation<
        void,
        Error,
        { bookingId: string; imageIds: string[] }
    >({
        mutationFn: async ({ imageIds }) => {
            const { data: imagesToDelete, error: fetchErr } = await supabase
                .from('booking_images')
                .select('id, image_url')
                .in('id', imageIds);

            if (fetchErr) throw new Error('Failed to fetch image URLs for deletion.');
            if (!imagesToDelete || imagesToDelete.length === 0) return;

            const { error: dbDeleteError } = await supabase
                .from('booking_images')
                .delete()
                .in('id', imageIds);

            if (dbDeleteError) throw new Error('Failed to delete image records from DB.');

            const urlsToDelete = imagesToDelete.map(img => img.image_url);
            await deleteBookingImages(urlsToDelete);

        },
        onSuccess: (_, variables) => {
            toast.success('Images deleted successfully!');
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.bookingId) });
        },
        onError: (error) => {
            toast.error(`Image deletion failed: ${error.message}`);
        }
    });
};


// Hook for fetching bookings for select dropdowns (simplified)
export const useGetBookingsForSelect = () => {
    return useQuery({
        queryKey: ['bookings', 'selectList'], // Simple key
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('id, booking_number, guest_name') // Select minimal data
                .order('created_at', { ascending: false })
                .limit(100); // Limit results for performance

            if (error) throw error;
            return data?.map(b => ({
                 id: b.id,
                 // Create a display reference
                 reference: `${b.booking_number || 'No Ref'} - ${b.guest_name || 'No Guest'}`
            })) || [];
        },
         staleTime: 5 * 60 * 1000, // Cache for 5 mins
    });
};
