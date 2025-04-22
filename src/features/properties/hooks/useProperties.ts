import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type { Property, CreatePropertyPayload, UpdatePropertyPayload, PropertyImage } from '@/features/properties/types';
import { toast } from 'sonner';

const PROPERTY_QUERY_KEY = 'properties';

// == Query Functions ==

/**
 * Fetches a list of properties.
 * TODO: Implement filtering and sorting parameters.
 */
const getProperties = async (): Promise<Property[]> => {
  const { data, error } = await supabase
    .from('properties')
    .select('*') // Select all property fields for now
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Fetches a single property by its ID, including its images.
 */
const getProperty = async (id: string): Promise<Property | null> => {
  const { data, error } = await supabase
    .from('properties')
    .select('* , property_images (*)') // Fetch property and its images
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Handle not found gracefully
    throw new Error(error.message);
  }
  // Sort images by order if they exist
  if (data?.property_images) {
      data.property_images.sort((a: PropertyImage, b: PropertyImage) => a.order - b.order);
  }
  return data as Property | null;
};

// == Mutation Functions ==

/**
 * Handles image uploads to Supabase Storage.
 * Returns an array of URLs or paths to the uploaded images.
 */
const uploadPropertyImages = async (propertyId: string, files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const filePath = `public/properties/${propertyId}/${fileName}`; // Unique path per property

        const { error: uploadError } = await supabase.storage
            .from('property-images') // Corrected bucket name
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error(`Failed to upload image ${file.name}: ${uploadError.message}`);
        }

        // Get public URL (adjust if using signed URLs or different access method)
        const { data: urlData } = supabase.storage
            .from('property-images') // Corrected bucket name
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    });

    return Promise.all(uploadPromises);
};

/**
 * Deletes images from Supabase Storage.
 */
const deletePropertyImages = async (imageUrls: string[]): Promise<void> => {
    if (!imageUrls || imageUrls.length === 0) return;

    // Extract file paths from URLs (this depends heavily on your URL structure and bucket settings)
    // Assuming public URL like: https://<project_ref>.supabase.co/storage/v1/object/public/property-images/public/properties/<prop_id>/<filename>
    const filePaths = imageUrls.map(url => {
        try {
            const urlParts = new URL(url).pathname.split('/public/property-images/'); // Corrected bucket name in path split
            return urlParts[1];
        } catch (e) {
            console.error('Could not parse image URL for deletion:', url);
            return null;
        }
    }).filter(path => path !== null) as string[];

    if (filePaths.length === 0) return;

    const { error } = await supabase.storage
        .from('property-images') // Corrected bucket name
        .remove(filePaths);

    if (error) {
        console.error('Error deleting images:', error);
        // Decide if this should throw or just log
        toast.error(`Failed to delete some images: ${error.message}`);
    }
};


/**
 * Creates a new property, uploads images, and associates them.
 */
const createProperty = async (payload: CreatePropertyPayload): Promise<Property> => {
  // Separate image files from the rest of the payload
  const { imageFiles, ...propertyData } = payload;

  // 1. Insert property data
  const { data: newProperty, error: propertyError } = await supabase
    .from('properties')
    .insert(propertyData)
    .select()
    .single();

  if (propertyError) {
    console.error('Error creating property:', propertyError);
    throw new Error(propertyError.message);
  }
  if (!newProperty) {
    throw new Error('Failed to create property, no data returned.');
  }

  // 2. Upload images if any
  let uploadedImageUrls: string[] = [];
  if (imageFiles && imageFiles.length > 0) {
    try {
        uploadedImageUrls = await uploadPropertyImages(newProperty.id, imageFiles);
    } catch (uploadError: any) {
        // Attempt to clean up created property if image upload fails?
        console.error('Image upload failed after creating property:', uploadError);
        // Consider deleting the property record here, or notify user to fix
        toast.error(`Property created, but image upload failed: ${uploadError.message}. Please edit the property to add images.`);
        // Continue without images for now
    }
  }

  // 3. Insert image records into property_images table
  if (uploadedImageUrls.length > 0) {
    const imageRecords = uploadedImageUrls.map((url, index) => ({
      property_id: newProperty.id,
      image_url: url,
      order: index,
    }));

    const { error: imageError } = await supabase
      .from('property_images')
      .insert(imageRecords);

    if (imageError) {
      console.error('Error saving image records:', imageError);
      // Property exists, but images aren't linked in DB
      toast.error(`Property created, but failed to link images: ${imageError.message}. Please edit the property.`);
    }
  }

  // Return the created property (without images attached yet, query needed to see them)
  return newProperty as Property;
};

/**
 * Updates an existing property, handles image additions/deletions.
 */
const updateProperty = async (payload: UpdatePropertyPayload): Promise<Property> => {
    const { id, newImageFiles, deletedImageIds, ...propertyData } = payload;

    // 1. Delete images marked for deletion (from storage and DB)
    if (deletedImageIds && deletedImageIds.length > 0) {
        // Fetch URLs to delete from storage
        const { data: imagesToDelete, error: fetchErr } = await supabase
            .from('property_images')
            .select('id, image_url')
            .in('id', deletedImageIds);

        if (fetchErr) {
            console.error('Failed to fetch images for deletion:', fetchErr);
            toast.error('Could not fetch images to delete.');
        } else if (imagesToDelete && imagesToDelete.length > 0) {
            // Delete from DB first
            const { error: dbDeleteError } = await supabase
                .from('property_images')
                .delete()
                .in('id', deletedImageIds);

            if (dbDeleteError) {
                console.error('Failed to delete image records from DB:', dbDeleteError);
                toast.error('Failed to delete image records.');
            } else {
                // If DB deletion successful, delete from storage
                const urlsToDelete = imagesToDelete.map(img => img.image_url);
                await deletePropertyImages(urlsToDelete); // Logs errors internally
            }
        }
    }

    // 2. Upload new images
    let uploadedImageUrls: string[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
        try {
            uploadedImageUrls = await uploadPropertyImages(id, newImageFiles);
        } catch (uploadError: any) {
            console.error('Failed to upload new images during update:', uploadError);
            toast.error(`Failed to upload new images: ${uploadError.message}`);
            // Continue with property data update regardless
        }
    }

    // 3. Update property data
    const { data: updatedProperty, error: propertyUpdateError } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', id)
        .select()
        .single();

    if (propertyUpdateError) {
        console.error('Error updating property data:', propertyUpdateError);
        throw new Error(propertyUpdateError.message);
    }
    if (!updatedProperty) {
        throw new Error('Failed to update property, no data returned.');
    }

    // 4. Insert new image records
    if (uploadedImageUrls.length > 0) {
        // Need to determine the order for new images (find max existing order)
        const { data: existingImages, error: orderError } = await supabase
            .from('property_images')
            .select('order')
            .eq('property_id', id)
            .order('order', { ascending: false })
            .limit(1);

        let nextOrder = 0;
        if (!orderError && existingImages && existingImages.length > 0) {
            nextOrder = existingImages[0].order + 1;
        }

        const newImageRecords = uploadedImageUrls.map((url, index) => ({
            property_id: id,
            image_url: url,
            order: nextOrder + index,
        }));

        const { error: imageInsertError } = await supabase
            .from('property_images')
            .insert(newImageRecords);

        if (imageInsertError) {
            console.error('Error saving new image records during update:', imageInsertError);
            toast.error(`Property updated, but failed to link new images: ${imageInsertError.message}.`);
        }
    }

    return updatedProperty as Property;
};

/**
 * Deletes a property and its associated images from storage.
 */
const deleteProperty = async (id: string): Promise<void> => {
    // 1. Get image URLs to delete from storage
    const { data: images, error: fetchErr } = await supabase
        .from('property_images')
        .select('image_url')
        .eq('property_id', id);

    if (fetchErr) {
        console.error('Could not fetch images before property deletion:', fetchErr);
        // Proceed with property deletion anyway?
    }

    // 2. Delete the property record (CASCADE should handle property_images in DB)
    const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

    if (deleteError) {
        console.error('Error deleting property:', deleteError);
        throw new Error(deleteError.message);
    }

    // 3. Delete images from storage using the helper
    if (images && images.length > 0) {
        const urlsToDelete = images.map(img => img.image_url);
        await deletePropertyImages(urlsToDelete); // Helper uses correct bucket name
    }
    // Also delete the storage folder itself
    const { error: folderError } = await supabase.storage
        .from('property-images') // Corrected bucket name
        .remove([`public/properties/${id}`]); // Remove the folder
     if (folderError) {
        console.warn(`Could not delete property image folder public/properties/${id}:`, folderError);
     }
};

// == React Query Hooks ==

export const useGetProperties = () => {
  return useQuery<Property[], Error>({
    queryKey: [PROPERTY_QUERY_KEY],
    queryFn: getProperties,
    // Add staleTime, cacheTime as needed
  });
};

export const useGetProperty = (id: string | null) => {
  return useQuery<Property | null, Error>({
    queryKey: [PROPERTY_QUERY_KEY, id],
    queryFn: () => (id ? getProperty(id) : Promise.resolve(null)),
    enabled: !!id, // Only run query if id is provided
  });
};

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  return useMutation<Property, Error, CreatePropertyPayload>({
    mutationFn: createProperty,
    onSuccess: () => {
      // Invalidate and refetch the properties list
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      toast.success('Property created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create property: ${error.message}`);
    },
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  return useMutation<Property, Error, UpdatePropertyPayload>({
    mutationFn: updateProperty,
    onSuccess: (data) => {
      // Invalidate the list and the specific property query
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY, data.id] });
      // Optionally update the cache directly for a faster UI update
      // queryClient.setQueryData([PROPERTY_QUERY_KEY, data.id], data);
      toast.success('Property updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update property: ${error.message}`);
    },
  });
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteProperty,
    onSuccess: (_, id) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      // Optionally remove the specific property query from cache
      queryClient.removeQueries({ queryKey: [PROPERTY_QUERY_KEY, id] });
      toast.success('Property deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete property: ${error.message}`);
    },
  });
}; 