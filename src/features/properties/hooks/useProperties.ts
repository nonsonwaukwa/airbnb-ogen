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

// == Image Function (Cloudinary Integration) ==

/**
 * Uploads a single image file to Cloudinary via the Supabase Edge Function,
 * specifying the 'properties' folder.
 * Returns the secure URL of the uploaded image.
 */
const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'properties'); // Specify the folder for properties

  try {
    const { data, error } = await supabase.functions.invoke(
      'upload-to-cloudinary',
      { body: formData }
    );

    if (error) {
      console.error('Edge function invocation error:', error);
      throw new Error(`Edge function failed: ${error.message}`);
    }

    if (!data || !data.secure_url) {
      console.error('Invalid response from edge function:', data);
      throw new Error('Failed to get secure URL from upload function.');
    }

    return data.secure_url;
  } catch (err) {
    console.error('Error uploading property image via edge function:', err);
    throw new Error(`Image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// == Mutation Functions ==

/**
 * Creates a new property, uploads images to Cloudinary, and associates them.
 */
const createProperty = async (payload: CreatePropertyPayload): Promise<Property> => {
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

  // 2. Upload images to Cloudinary if any
  let uploadedImageUrls: string[] = [];
  if (imageFiles && imageFiles.length > 0) {
    const uploadPromises = imageFiles.map(file => uploadImageToCloudinary(file));
    try {
        uploadedImageUrls = await Promise.all(uploadPromises);
    } catch (uploadError: any) {
        console.error('Cloudinary image upload failed after creating property:', uploadError);
        toast.error(`Property created, but image upload failed: ${uploadError.message}. Please edit the property to add images.`);
        // Decide if we should attempt to delete the created property here
    }
  }

  // 3. Insert image records into property_images table using Cloudinary URLs
  if (uploadedImageUrls.length > 0) {
    const imageRecords = uploadedImageUrls.map((url, index) => ({
      property_id: newProperty.id,
      image_url: url, // Store Cloudinary URL
      order: index,
    }));

    const { error: imageError } = await supabase
      .from('property_images')
      .insert(imageRecords);

    if (imageError) {
      console.error('Error saving image records:', imageError);
      toast.error(`Property created, but failed to link images: ${imageError.message}. Please edit the property.`);
    }
  }

  // Refetch the property with images
  const finalProperty = await getProperty(newProperty.id);
  if (!finalProperty) throw new Error('Failed to refetch created property with images.');
  return finalProperty;
};

/**
 * Updates an existing property, handles Cloudinary image additions/deletions.
 */
const updateProperty = async (payload: UpdatePropertyPayload): Promise<Property> => {
    const { id, newImageFiles, deletedImageIds, ...propertyData } = payload;

    // 1. Delete image records marked for deletion from the DB
    if (deletedImageIds && deletedImageIds.length > 0) {
        const { error: dbDeleteError } = await supabase
            .from('property_images')
            .delete()
            .in('id', deletedImageIds);

        if (dbDeleteError) {
            console.error('Failed to delete image records from DB:', dbDeleteError);
            toast.error('Failed to delete image records.');
            // Consider if this error should halt the update
        }
        // NOTE: We are not deleting from Cloudinary here.
        // Deleting orphaned files in Cloudinary might require a separate process.
    }

    // 2. Upload new images to Cloudinary
    let uploadedImageUrls: string[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
        const uploadPromises = newImageFiles.map(file => uploadImageToCloudinary(file));
        try {
            uploadedImageUrls = await Promise.all(uploadPromises);
        } catch (uploadError: any) {
            console.error('Failed to upload new images to Cloudinary during update:', uploadError);
            toast.error(`Failed to upload new images: ${uploadError.message}`);
            // Continue with property data update regardless
        }
    }

    // 3. Update property data
    const { data: updatedPropertyData, error: propertyUpdateError } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', id)
        .select('id') // Only need ID, will refetch
        .single();

    if (propertyUpdateError) {
        console.error('Error updating property data:', propertyUpdateError);
        throw new Error(propertyUpdateError.message);
    }
    if (!updatedPropertyData) {
        throw new Error('Failed to update property, no data returned or ID mismatch.');
    }

    // 4. Insert new image records using Cloudinary URLs
    if (uploadedImageUrls.length > 0) {
        const { data: existingImages, error: orderError } = await supabase
            .from('property_images')
            .select('order')
            .eq('property_id', id)
            .order('order', { ascending: false })
            .limit(1);

        let startOrder = 0;
        if (orderError) {
            console.error('Error fetching max image order:', orderError);
        } else if (existingImages && existingImages.length > 0) {
            startOrder = (existingImages[0].order ?? -1) + 1;
        }

        const newImageRecords = uploadedImageUrls.map((url, index) => ({
            property_id: id,
            image_url: url, // Store Cloudinary URL
            order: startOrder + index,
        }));

        const { error: imageInsertError } = await supabase
            .from('property_images')
            .insert(newImageRecords);

        if (imageInsertError) {
            console.error('Error saving new image records:', imageInsertError);
            toast.error(`Property updated, but failed to link new images: ${imageInsertError.message}.`);
        }
    }

    // 5. Refetch the entire property data
    const finalProperty = await getProperty(id);
    if (!finalProperty) throw new Error('Failed to refetch updated property with images.');
    return finalProperty;
};

/**
 * Deletes a property AND its associated image records.
 * Note: Does not delete images from Cloudinary storage.
 */
const deleteProperty = async (id: string): Promise<void> => {
    // We might want transaction safety here, but for simplicity:
    // 1. Delete associated image records
    const { error: imageDeleteError } = await supabase
        .from('property_images')
        .delete()
        .eq('property_id', id);

    if (imageDeleteError) {
        console.error(`Error deleting images for property ${id}:`, imageDeleteError);
        toast(`Could not delete associated images, but proceeding with property deletion.`, { 
             description: imageDeleteError.message, 
             // You might want to customize the appearance/duration for warnings 
        });
        // Don't necessarily stop the property deletion
    }

    // 2. Delete the property itself
    const { error: propertyDeleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

    if (propertyDeleteError) {
        console.error(`Error deleting property ${id}:`, propertyDeleteError);
        throw new Error(propertyDeleteError.message);
    }

    // TODO: Consider deleting images from Cloudinary here or via a cleanup script
    // Fetch URLs before deleting DB records if implementing Cloudinary delete
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
    onSuccess: (data) => {
      toast.success(`Property "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      // Pre-populate the cache for the new property detail view
      queryClient.setQueryData([PROPERTY_QUERY_KEY, data.id], data);
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
      toast.success(`Property "${data.name}" updated successfully!`);
      // Invalidate both the list and the specific property detail
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY, data.id] });
      // Update the specific property cache directly
      queryClient.setQueryData([PROPERTY_QUERY_KEY, data.id], data);
    },
    onError: (error) => {
      toast.error(`Failed to update property: ${error.message}`);
    },
  });
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({ // Takes propertyId (string)
    mutationFn: deleteProperty,
    onSuccess: (_, propertyId) => {
      toast.success("Property deleted successfully!");
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: [PROPERTY_QUERY_KEY] });
      // Remove the specific property detail from cache
      queryClient.removeQueries({ queryKey: [PROPERTY_QUERY_KEY, propertyId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete property: ${error.message}`);
    },
  });
}; 