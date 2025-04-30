import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase'; // Ensure correct path
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthProvider'; // Ensure correct path
import type { Database } from '@/types/supabase'; // Ensure correct path
import type {
    Issue,
    IssueComment,
    CreateIssuePayload,
    UpdateIssuePayload,
    CreateIssueCommentPayload,
    IssueImage,
    IssueStatus
} from '../types'; // Ensure correct path

// Query key factory
const issueKeys = {
    all: ['issues'] as const,
    lists: () => [...issueKeys.all, 'list'] as const,
    list: (filters: { status?: string; propertyId?: string; assignedUserId?: string | null }) => // Allow null for unassigned filter
        [...issueKeys.lists(), filters] as const,
    details: () => [...issueKeys.all, 'detail'] as const,
    detail: (id: string) => [...issueKeys.details(), id] as const,
    comments: (issueId: string) => [...issueKeys.detail(issueId), 'comments'] as const,
    images: (issueId: string) => [...issueKeys.detail(issueId), 'images'] as const,
};

// Additional query key factories for users and bookings
const userKeys = {
    all: ['users'] as const, // Keep key name generic for simplicity
    staff: () => [...userKeys.all, 'staff'] as const,
};

const bookingKeys = {
    all: ['bookings'] as const,
    active: () => [...bookingKeys.all, 'active'] as const,
};

// Types for booking select data
type Tables = Database['public']['Tables'];
type BookingRow = Tables['bookings']['Row'];
type PropertyRow = Tables['properties']['Row'];

interface BookingWithProperty extends Omit<BookingRow, 'property_id'> {
    property: Pick<PropertyRow, 'id' | 'name'> | null;
}

interface BookingSelectOption extends BookingWithProperty {
    display_name: string;
}

// Fetch list of issues with optional filters
export const useGetIssues = (filters?: { status?: string; propertyId?: string; assignedUserId?: string | null }) => { // Allow null for assignedUserId
    return useQuery({
        queryKey: issueKeys.list(filters || {}),
        queryFn: async () => {
            let query = supabase
                .from('issues')
                .select(`
                    *,
                    property:property_id(id, name),
                    booking:booking_id(id, guest_name),
                    assigned_to_user:assigned_to_user_id(id, full_name) /* Corrected FK and selection */
                `)
                .order('created_at', { ascending: false }); // Add default ordering

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.propertyId) {
                query = query.eq('property_id', filters.propertyId);
            }
            // Handle filtering by assigned user ID, including null for unassigned
            if (filters?.assignedUserId !== undefined) {
                 if (filters.assignedUserId === null) {
                    query = query.is('assigned_to_user_id', null); // Filter for unassigned
                 } else {
                    query = query.eq('assigned_to_user_id', filters.assignedUserId); // Filter for specific user
                 }
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching issues:", error); // Log the specific error
                throw error;
            }

            // Ensure the return type matches what IssueListTable expects
            return data as Issue[];
        },
        // Keep previous data while refetching for smoother UX
        placeholderData: (previousData) => previousData,
    });
};

// Fetch single issue by ID
export const useGetIssue = (id: string | undefined) => { // Allow id to be undefined initially
    return useQuery({
        queryKey: issueKeys.detail(id as string), // Only enable when id is defined
        queryFn: async () => {
            if (!id) return null; // Return null if no ID
            const { data, error } = await supabase
                .from('issues')
                .select(`
                    *,
                    property:property_id(id, name),
                    booking:booking_id(id, guest_name, checkin_datetime, checkout_datetime),
                    reported_by_user:reported_by_user_id(id, full_name),
                    assigned_to_user:assigned_to_user_id(id, full_name)
                    /* Removed expense join until Phase 8:
                    , expense:associated_expense_id(id, amount, currency)
                    */
                `)
                .eq('id', id)
                .single();

            if (error) {
                 // Handle not found gracefully
                if (error.code === 'PGRST116') {
                    console.warn(`Issue with ID ${id} not found.`);
                    return null;
                }
                console.error("Error fetching issue details:", error);
                throw error;
            }

            // Ensure your Issue type definition includes these nested objects
            // Note: The 'expense' field will not exist on this data yet
            return data as Issue;
        },
        enabled: !!id, // Query only runs when id is truthy
    });
};

// Create new issue
export const useCreateIssue = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Get user ID for reported_by

    return useMutation({
        mutationFn: async (payload: CreateIssuePayload) => {
             if (!user?.id) throw new Error("User not authenticated");

            const { data, error } = await supabase
                .from('issues')
                .insert({
                    ...payload,
                    status: 'open', // Ensure default status
                    date_reported: new Date().toISOString(),
                    reported_by_user_id: user.id, // Set reporter
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as Issue;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
            toast.success('Issue created successfully');
        },
        onError: (error) => {
            toast.error('Failed to create issue: ' + error.message);
        },
    });
};

// Update existing issue
export const useUpdateIssue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UpdateIssuePayload & { id: string }) => {
            console.log('[useUpdateIssue] Received payload:', payload); // Log incoming payload
            
            const { id, ...updateData } = payload;
            
            const updates = {
                ...updateData,
                date_resolved: updateData.status === 'resolved'
                    ? new Date().toISOString()
                    : (updateData.status ? null : undefined),
            };
            if (updateData.status === undefined) {
                delete updates.date_resolved;
            }

            console.log('[useUpdateIssue] Sending updates:', updates); // Log the object being sent to .update()

            const { data, error } = await supabase
                .from('issues')
                .update(updates)
                .eq('id', id)
                .select() 
                .single();

            if (error) {
                console.error('[useUpdateIssue] Supabase update error:', error); // Log Supabase error
                throw error;
            }

            console.log('[useUpdateIssue] Update successful:', data); // Log success data
            return data as Issue;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
            queryClient.invalidateQueries({ queryKey: issueKeys.detail(variables.id) });
            toast.success('Issue updated successfully');
        },
        onError: (error) => {
            // Added more specific logging here
            console.error('[useUpdateIssue] Mutation onError:', error);
            toast.error('Failed to update issue: ' + error.message);
        },
    });
};

// Delete issue
export const useDeleteIssue = () => {
    const queryClient = useQueryClient();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    return useMutation({
        mutationFn: async (id: string) => {
            // First, get associated image URLs to delete from Cloudinary
            const { data: images, error: imageError } = await supabase
                .from('issue_images')
                .select('id, image_url, cloudinary_public_id') // Select URL too
                .eq('issue_id', id);

            if (imageError) {
                console.error("Error fetching image URLs for deletion:", imageError);
                // Log and continue, might leave orphaned images
            }

            const imageUrlsToDelete = images?.map(img => img.image_url).filter(Boolean) as string[];

            if (imageUrlsToDelete?.length) {
                console.log(`Attempting to delete ${imageUrlsToDelete.length} images from Cloudinary via Edge Function...`);
                const deleteFunctionEndpoint = `${supabaseUrl}/functions/v1/delete-cloudinary-images`;
                try {
                    const response = await fetch(deleteFunctionEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Add Authorization header if your function requires it (e.g., for RLS inside function)
                            // 'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ imageUrls: imageUrlsToDelete }),
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        console.error("Cloudinary delete function failed:", response.status, errorBody);
                        // Decide whether to stop the whole process or continue
                        // For now, log the error and continue deleting the issue from DB
                        // throw new Error(`Failed to delete images (${response.status})`);
                    } else {
                         const result = await response.json();
                         console.log("Cloudinary delete function success:", result);
                    }

                } catch (deleteError) {
                    console.error(`Error calling delete-cloudinary-images function:`, deleteError);
                    // Decide if we should stop the whole process or continue
                }
            }

            // Then, delete the issue itself from Supabase
            const { error: deleteIssueError } = await supabase
                .from('issues')
                .delete()
                .eq('id', id);

            if (deleteIssueError) {
                console.error("Error deleting issue from Supabase:", deleteIssueError);
                throw deleteIssueError; // Throw the error from deleting the issue itself
            }
        },
        onSuccess: (_, issueId) => { // Pass issueId to remove from cache if needed
            queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
            queryClient.removeQueries({ queryKey: issueKeys.detail(issueId) }); // Remove detail query on delete
            toast.success('Issue deleted successfully');
        },
        onError: (error) => {
            // This will catch the deleteIssueError if thrown
            toast.error('Failed to delete issue: ' + error.message);
        },
    });
};

// Fetch issue comments
export const useGetIssueComments = (issueId: string | undefined) => { // Allow undefined
    return useQuery({
        queryKey: issueKeys.comments(issueId as string), // Enable only when defined
        queryFn: async () => {
             if (!issueId) return []; // Return empty array if no issueId
            const { data, error } = await supabase
                .from('issue_comments')
                .select(`
                    *,
                    user:profiles(id, full_name) /* Removed avatar_url for simplicity */
                `)
                .eq('issue_id', issueId)
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            return data as IssueComment[];
        },
        enabled: !!issueId, // Only run query if issueId is truthy
    });
};

// Add comment to issue
export const useAddIssueComment = () => {
    const queryClient = useQueryClient();
    const { profile } = useAuth(); // Get profile for user_id

    return useMutation({
        mutationFn: async (payload: CreateIssueCommentPayload) => {
            if (!profile?.id) throw new Error("User profile not found");

            const { data, error } = await supabase
                .from('issue_comments')
                .insert({ ...payload, user_id: profile.id }) // Set user_id from profile
                .select(`
                    *,
                    user:profiles(id, full_name) /* Removed avatar_url */
                `)
                .single();

            if (error) {
                throw error;
            }

            return data as IssueComment;
        },
        onSuccess: (newComment) => {
            // Optimistically update the comments list or invalidate
            queryClient.invalidateQueries({ queryKey: issueKeys.comments(newComment.issue_id) });
            // Example optimistic update (more complex):
            // queryClient.setQueryData(issueKeys.comments(newComment.issue_id), (oldData?: IssueComment[]) =>
            //    oldData ? [...oldData, newComment] : [newComment]
            // );
            toast.success('Comment added successfully');
        },
        onError: (error) => {
            toast.error('Failed to add comment: ' + error.message);
        },
    });
};

// --- CORRECTED useUsers HOOK ---
// Hook for fetching staff users (potential assignees)
export const useUsers = () => { // Renamed from useGetStaffForSelect for clarity
    return useQuery({
        queryKey: userKeys.staff(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles') // <<<--- Ensure this says 'profiles', NOT 'users'
                .select('id, full_name') // Select only needed fields
                .eq('status', 'Active') // Only active staff members
                .order('full_name');

            if (error) {
                console.error("Error fetching users (profiles):", error); // Log error
                throw error;
            }

            // Return a simple array of users
            return data as Array<{ id: string; full_name: string }>;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
};
// --- END CORRECTED useUsers HOOK ---


// Hook for fetching active bookings for the select dropdown
export const useGetBookingsForSelect = () => {
    return useQuery({
        queryKey: bookingKeys.active(),
        queryFn: async () => {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    guest_name,
                    checkin_datetime,
                    checkout_datetime,
                    property:property_id(id, name)
                `)
                 // Fetch bookings ending today or later, or maybe active now? Adjust logic as needed.
                .gte('checkout_datetime', now)
                .order('checkin_datetime');

            if (error) {
                throw error;
            }

            // Transform the raw data into BookingSelectOption
            return (data as unknown as BookingWithProperty[]).map((booking): BookingSelectOption => ({
                ...booking,
                // Create a more descriptive display name
                display_name: `${booking.guest_name} @ ${booking.property?.name || 'N/A'} (${new Date(booking.checkin_datetime).toLocaleDateString()} - ${new Date(booking.checkout_datetime).toLocaleDateString()})`
            }));
        },
        staleTime: 5 * 60 * 1000,
    });
};

// Hook for fetching issue images
export const useGetIssueImages = (issueId: string | undefined) => { // Allow undefined
    return useQuery({
        queryKey: issueKeys.images(issueId as string), // Enable only when defined
        queryFn: async () => {
            if (!issueId) return []; // Return empty array if no issueId
            const { data, error } = await supabase
                .from('issue_images')
                .select('*')
                .eq('issue_id', issueId)
                .order('uploaded_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as IssueImage[];
        },
        enabled: !!issueId, // Only run query if issueId is truthy
    });
};

// Hook for uploading issue images (handles multiple files)
export const useUploadIssueImage = () => {
    const queryClient = useQueryClient();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    return useMutation({
        mutationFn: async ({ issueId, files }: { issueId: string; files: File[] }) => {
            if (!files || files.length === 0) return { images: [], errors: undefined };

            const uploadedImages: IssueImage[] = [];
            const errors: Error[] = [];

            // Process each file
            for (const file of files) {
                try {
                    // 1. Upload to Cloudinary via Edge Function
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', 'issues'); // Specify Cloudinary folder

                    const uploadFunctionEndpoint = `${supabaseUrl}/functions/v1/upload-to-cloudinary`;
                    const uploadResponse = await fetch(uploadFunctionEndpoint, {
                        method: 'POST',
                        // Add Authorization header if your Edge Function requires it
                        // headers: { 'Authorization': `Bearer ${accessToken}` },
                        body: formData,
                    });

                    if (!uploadResponse.ok) {
                         const errorBody = await uploadResponse.text();
                         console.error(`Cloudinary upload failed for ${file.name}:`, errorBody);
                         throw new Error(`Failed to upload ${file.name}`);
                    }

                    const { secure_url, public_id } = await uploadResponse.json();

                     if (!secure_url || !public_id) {
                         console.error(`Missing secure_url or public_id from Cloudinary response for ${file.name}`);
                         throw new Error(`Invalid response from image upload service for ${file.name}`);
                     }


                    // 2. Save reference in Supabase
                    const { data, error } = await supabase
                        .from('issue_images')
                        .insert({
                            issue_id: issueId,
                            image_url: secure_url,
                            cloudinary_public_id: public_id,
                        })
                        .select()
                        .single();

                    if (error) throw error;
                    uploadedImages.push(data as IssueImage);

                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    errors.push(error as Error);
                }
            }

            // If all uploads failed, throw a combined error
            if (uploadedImages.length === 0 && errors.length > 0) {
                throw new Error(`Failed to upload any images: ${errors.map(e => e.message).join(', ')}`);
            }

            // Return successful uploads and any errors
            return {
                images: uploadedImages,
                errors: errors.length > 0 ? errors : undefined
            };
        },
        onSuccess: (result, variables) => {
            // Invalidate the images query to refresh the list
            queryClient.invalidateQueries({ queryKey: issueKeys.images(variables.issueId) });

            // Show success/warning toast based on partial success
            if (result.errors && result.errors.length > 0) {
                toast.warning(`Some images failed to upload (${result.errors.length} error${result.errors.length > 1 ? 's' : ''}).`);
            } else {
                toast.success(`${result.images.length} image${result.images.length > 1 ? 's' : ''} uploaded successfully`);
            }
        },
        onError: (error) => {
            toast.error(`Failed to upload images: ${error.message}`);
        },
    });
};

// Hook for deleting issue images (handles Cloudinary deletion)
export const useDeleteIssueImage = () => {
    const queryClient = useQueryClient();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    return useMutation({
        mutationFn: async ({ imageId, issueId, imageUrl, cloudinaryPublicId }: {
            imageId: string;
            issueId: string;
            imageUrl: string; // Keep URL for potential fallback/logging
            cloudinaryPublicId?: string | null; // Use public ID if available
        }) => {

            // 1. Delete from Cloudinary via Edge Function (prefer using public_id)
            if (cloudinaryPublicId) {
                 console.log(`Attempting to delete Cloudinary image via Edge Function (Public ID: ${cloudinaryPublicId})...`);
                 const deleteFunctionEndpoint = `${supabaseUrl}/functions/v1/delete-cloudinary-images`; // Ensure this function exists and handles public IDs
                 try {
                    const response = await fetch(deleteFunctionEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Add Authorization header if needed
                        },
                        // Send public_id(s) instead of URLs if your function supports it
                        body: JSON.stringify({ publicIds: [cloudinaryPublicId] }),
                    });

                     if (!response.ok) {
                         const errorBody = await response.text();
                         console.error("Cloudinary delete function failed:", response.status, errorBody);
                         // Decide if you want to stop or continue to delete DB record
                         // throw new Error(`Failed to delete image from Cloudinary (${response.status})`);
                         toast.warning(`Failed to delete image from Cloudinary, but removing DB record.`); // Example: proceed
                     } else {
                          const result = await response.json();
                          console.log("Cloudinary delete function success:", result);
                     }
                 } catch(deleteError) {
                     console.error(`Error calling delete-cloudinary-images function:`, deleteError);
                     toast.warning(`Error calling Cloudinary delete function, but removing DB record.`); // Example: proceed
                 }
            } else {
                 console.warn(`Cloudinary Public ID missing for image ${imageId}. Cannot delete from Cloudinary.`);
                 // Optionally try deleting by URL if your function supports it, but public_id is safer
            }


            // 2. Delete from Supabase regardless of Cloudinary success (or make conditional)
            const { error } = await supabase
                .from('issue_images')
                .delete()
                .eq('id', imageId);

            if (error) {
                throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: issueKeys.images(variables.issueId) });
            toast.success('Image deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete image: ${error.message}`);
        },
    });
};
