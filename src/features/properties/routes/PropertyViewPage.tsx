import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProperty } from '@/features/properties/hooks/useProperties';
import { PropertyViewDisplay } from '@/features/properties/components/PropertyViewDisplay';
import { PropertyForm } from '@/features/properties/components/PropertyForm'; // Import form
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'; // Import Sheet components
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Edit } from 'lucide-react';
import { toast } from 'sonner';

export function PropertyViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { data: property, isLoading, isError, error } = useGetProperty(id ?? null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const canView = permissions.view_properties === true;
  const canEdit = permissions.edit_properties === true;

  // Handle Loading State
  if (isLoading) {
    return (
        <div className="space-y-6">
            {/* Skeleton for header */}
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-9 w-1/4" />
                <Skeleton className="h-10 w-24" />
            </div>
             {/* Skeleton for images */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-lg" />
                ))}
            </div>
            {/* Skeleton for details card */}
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
  }

  // Handle View Permission Denied
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-yellow-500 bg-yellow-50 p-8 text-center text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view this property.</p>
         <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
        </Button>
      </div>
    );
  }

  // Handle Error or Not Found
  if (isError || !property) {
    toast.error(isError ? `Error fetching property: ${error?.message}` : 'Property not found.');
    return (
      <div className="text-center text-red-600">
        <p>{isError ? 'Failed to load property details.' : 'Property not found.'}</p>
         <Button variant="outline" onClick={() => navigate('/properties')} className="mt-4">
             <ArrowLeft className="mr-2 h-4 w-4"/> Back to List
        </Button>
      </div>
    );
  }

  // Handle successful edit callback
  const handleEditSuccess = () => {
      setIsSheetOpen(false);
      // Data refetching handled by mutation hook invalidation
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Consider adding breadcrumbs here later */}
        <Button variant="outline" onClick={() => navigate('/properties')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>

        {canEdit && (
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button>
                        <Edit className="mr-2 h-4 w-4" /> Edit Property
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                        <SheetTitle>Edit Property</SheetTitle>
                        <SheetDescription>
                           Update the details for "{property.name}".
                        </SheetDescription>
                    </SheetHeader>
                    <div className="px-6 py-6">
                         {/* Pass property data to the form */}
                        <PropertyForm property={property} onSubmitSuccess={handleEditSuccess} />
                    </div>
                </SheetContent>
            </Sheet>
        )}
      </div>

      {/* Display Property Details */}
      <PropertyViewDisplay property={property} />
    </div>
  );
} 