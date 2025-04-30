// src/features/issues/pages/IssueFormPage.tsx
import { useState, useEffect } from 'react'; // Import useState, useEffect
import { useNavigate, useParams } from 'react-router-dom';
import { IssueForm, FormSchema } from '../components/IssueForm';
// Import necessary hooks
import {
    useCreateIssue,
    useUpdateIssue, // Import update hook
    useGetIssue, // Import get hook
    useGetBookingsForSelect,
    useUsers,
    useUploadIssueImage // Import the upload hook
} from '../hooks/useIssues';
import { useGetProperties } from '@/features/properties/hooks/useProperties';
import { toast } from 'sonner'; // Import toast for notifications
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { IssueCategory } from '../types'; // Import enum if needed
import { useAuth } from '@/app/AuthProvider';
import { useGetUsers } from '@/features/users/hooks/useGetUsers';
import { useGetBookings } from '@/features/bookings/hooks/useBookings';

export function IssueFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Get ID from URL params
  const { user, hasPermission } = useAuth(); // Get hasPermission

  // <<< --- ADD CONSOLE LOG HERE --- >>>
  console.log('ID from params:', id);
  // <<< ----------------------------- >>>

  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue(); // Use update hook
  const uploadImagesMutation = useUploadIssueImage(); // Initialize the upload hook

  // Determine if we are editing based on the presence of ID
  const isEditing = Boolean(id);

  // Fetch existing issue data ONLY if editing
  const { data: issue, isLoading: isLoadingIssue } = useGetIssue(id ?? '');

  // State to hold selected files
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Fetch data needed for form dropdowns
  const { data: propertiesData } = useGetProperties();
  const { data: usersData } = useGetUsers();
  const { data: bookingsData } = useGetBookings();

  // Check specific permissions
  const canEditDetails = hasPermission(isEditing ? 'edit_issues' : 'add_issues');
  const canAssign = hasPermission('assign_issues');

  // Transform data
  const properties = propertiesData?.map(p => ({ id: p.id, name: p.name }));
  const users = usersData?.map(u => ({ id: u.id, full_name: u.full_name }));
  const bookings = bookingsData?.map(b => ({ id: b.id, reference: b.booking_number }));

  // Combine loading states
  const isLoading = isLoadingIssue;

  // Handler for when files are selected in the form
  const handleFilesChange = (files: FileList | null) => {
    setSelectedFiles(files);
  };

  const handleFormSubmit = async (data: FormSchema) => {
    try {
      let issueId = id; // Use existing ID if editing

      if (isEditing) {
        // Update existing issue
        if (!id) throw new Error("Cannot update without an issue ID.");
        await updateIssueMutation.mutateAsync({ id, ...data });
        toast.success("Issue updated successfully!"); // Add specific success toast
      } else {
        // Create new issue
        await createIssueMutation.mutateAsync({ ...data, reported_by_user_id: user?.id ?? null });
        issueId = createIssueMutation.data?.id; // Get the ID of the newly created issue
         toast.success("Issue created successfully!"); // Add specific success toast
      }

      // If issue was created/updated successfully AND files were selected, upload them
      if (issueId && selectedFiles && selectedFiles.length > 0) {
        console.log(`Uploading ${selectedFiles.length} files for issue ${issueId}`);
        toast.info(`Uploading ${selectedFiles.length} image(s)...`);
        await uploadImagesMutation.mutateAsync({
          issueId: issueId,
          files: Array.from(selectedFiles), // Convert FileList to Array
        });
        // Upload hook handles its own success/error toasts
      }

      // Navigate after all operations
      navigate(isEditing ? `/issues/${id}` : '/issues'); // Go back to detail or list

    } catch (error) {
      // Error handled by the mutation hooks' onError, maybe add generic here too
      console.error("Error submitting issue form:", error);
      toast.error("Failed to save issue."); // Generic fallback toast
    }
  };

  // Prepare default values for the form
  // Important: Only pass issue data if isEditing and issue has loaded
  const formDefaultValues = isEditing && issue ? {
        title: issue.title,
        description: issue.description ?? '', // Handle null description
        category: issue.category ?? IssueCategory.Maintenance, // Use default if null
        priority: issue.priority ?? 'medium', // Use default if null
        estimated_cost: issue.estimated_cost,
        property_id: issue.property_id,
        assigned_to_user_id: issue.assigned_to_user_id,
        booking_id: issue.booking_id
    } : undefined; // Pass undefined if creating or issue hasn't loaded


  if (isLoading) {
     return (
          <div className="container mx-auto py-6 space-y-4">
             <Skeleton className="h-8 w-1/3" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-10 w-24 self-end" />
          </div>
     );
  }

   // Handle case where editing but issue not found
   if (isEditing && !issue) {
       return <div className="container mx-auto py-6">Issue not found or failed to load.</div>;
   }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">
         {isEditing ? `Edit Issue #${issue?.issue_number ?? id}` : 'Report New Issue'}
      </h1>
      <IssueForm
        // Pass key prop to force re-render with new defaults when switching between create/edit
        key={id ?? 'new'}
        issue={formDefaultValues} // Pass the prepared default values
        onSubmit={handleFormSubmit}
        onFilesChange={handleFilesChange} // Pass the file change handler
        isSubmitting={createIssueMutation.isPending || updateIssueMutation.isPending || uploadImagesMutation.isPending} // Combined submitting state
        // Pass fetched data to the form for dropdowns
        properties={properties}
        users={users}
        bookings={bookings}
        // Pass down specific permissions
        canEditDetails={canEditDetails}
        canAssign={canAssign}
      />
    </div>
  );
}
