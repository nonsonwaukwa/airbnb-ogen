import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyListTable } from '@/features/properties/components/PropertyListTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'; // Import AlertDialog components
import type { Property } from '@/features/properties/types';
import { useAuth } from '@/app/AuthProvider';
import { useDeleteProperty } from '@/features/properties/hooks/useProperties'; // Import delete hook
import { AlertTriangle, PlusCircle, ArrowLeft, Loader2 } from 'lucide-react'; // Import necessary icons

export function PropertiesPage() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const deleteMutation = useDeleteProperty();

  // Check relevant permissions
  const canView = permissions['view_properties'] === true;
  const canAdd = permissions['add_properties'] === true;
  // Edit/Delete permissions will be checked within the table/dialogs passed down

  // --- State for Delete Dialog (Lifted from Table) ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  // --- End Lifted State ---

  // --- Handlers ---
  const handleAddNew = () => {
    navigate('/properties/new'); // Navigate to create page
  };

  // Edit action now navigates directly from the table component via navigate prop
  const handleEditClick = (property: Property) => {
    // Note: The actual navigation happens in the table component's action item now
    // This function could be used if triggering an edit modal instead of navigating
    console.log("Edit requested for:", property.id);
    navigate(`/properties/${property.id}`); // Example navigation
  };

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete.id, {
        onSuccess: () => {
            setPropertyToDelete(null);
            setIsDeleteDialogOpen(false);
            // Toast handled in hook
        },
        onError: () => {
            // Toast handled in hook
            setPropertyToDelete(null);
            setIsDeleteDialogOpen(false);
        }
      });
    }
  };
  // --- End Handlers ---

  // Render Access Denied if user cannot view properties
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-yellow-500 bg-yellow-50 p-8 text-center text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view properties.</p>
         <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        {/* CardHeader with Title/Desc on left, Button on right */}
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div>
            <CardTitle className="text-3xl font-bold">Properties</CardTitle>
            <CardDescription className="text-base mt-2">
              View and manage property listings.
            </CardDescription>
          </div>
          {/* Add Property Button - Conditionally rendered */}
          {canAdd && (
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Property
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Pass down the handlers to the table */}
          <PropertyListTable
            onEdit={handleEditClick} // Pass edit handler (which navigates)
            onDelete={handleDeleteClick} // Pass delete handler (opens dialog)
          />
        </CardContent>
      </Card>

      {/* Render Delete Confirmation Dialog Here */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the property
                "<span className="font-semibold">{propertyToDelete?.name}</span>"
                and all associated data, including images.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                 >
                   {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {/* Note: PropertyForm is likely rendered via specific routes like /properties/new or /properties/:id/edit */}
      {/* It's not rendered directly on the list page unless using modals */}
    </>
  );
}

