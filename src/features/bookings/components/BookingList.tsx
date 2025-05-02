import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Correct the import name for the cancellation hook AND import update/delete/mark paid hooks
import {
    useGetBookings,
    useCancelBookingRPC,
    useDeleteBooking,
    useUpdateBookingStatus,
    useMarkBookingPaid // Import the hook for marking paid
} from '../hooks/useBookings'; // Ensure path is correct
import { BookingListTable } from './BookingListTable'; // Assuming this component exists
import { Dialog, DialogContent, DialogDescription, DialogHeader as DialogHeaderComponent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookingForm } from './BookingForm'; // Assuming this component exists
import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Booking, BookingStatus } from '../types'; // Import Booking type

export const BookingList: React.FC = () => {
  // --- Hooks ---
  const navigate = useNavigate();
  const { permissions, loading: authLoading } = useAuth();
  const [searchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: bookings = [], isLoading: isLoadingBookings, error: bookingsError } = useGetBookings();
  const cancelBookingMutation = useCancelBookingRPC();
  const deleteBookingMutation = useDeleteBooking();
  const updateStatusMutation = useUpdateBookingStatus();
  const markAsPaidMutation = useMarkBookingPaid(); // Initialize the mark paid hook
  // --- End of Hook Calls ---

  // Memoize filtered bookings
  const filteredBookings = useMemo(() => {
    const safeBookings = bookings ?? [];
    if (!searchQuery) {
        return safeBookings;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return safeBookings.filter((booking) =>
        booking.guest_name?.toLowerCase().includes(lowerCaseQuery) ||
        booking.booking_number?.toLowerCase().includes(lowerCaseQuery) ||
        booking.property?.name?.toLowerCase().includes(lowerCaseQuery)
      );
  }, [bookings, searchQuery]);

  // Combine loading states AFTER all hooks are called
  const isLoading = authLoading || isLoadingBookings;

  // Check permissions AFTER all hooks are called
  const canViewBookings = permissions?.view_bookings ?? false;
  const canAddBookings = permissions?.add_bookings ?? false;
  const canEditBookings = permissions?.edit_bookings ?? false;
  const canCancelBookings = (permissions?.add_bookings || permissions?.edit_bookings) ?? false;
  const canDeleteBookings = permissions?.delete_bookings ?? false;
  const canMarkPaid = (permissions?.add_bookings || permissions?.edit_bookings) ?? false; // Use same permission as edit/add for now

  // --- Handlers ---
  const handleAddBooking = () => {
    if (canAddBookings) {
        setIsCreateDialogOpen(true);
    } else {
        toast.error("You don't have permission to add bookings.");
    }
  };

  const handleEditBooking = (id: string) => {
     if (canEditBookings || canAddBookings) {
        navigate(`/bookings/${id}/edit`);
     } else {
         toast.error("You don't have permission to edit bookings.");
     }
  };

  // Combined handler for Cancel/Delete actions passed to the table
  const handleCancelOrDelete = async (booking: Booking) => {
     const isPending = booking.booking_status === 'pending' && booking.payment_status === 'pending';

     if (isPending) {
         // Attempt deletion for pending/pending
         if (!canDeleteBookings) {
             toast.error("You don't have permission to delete pending bookings.");
             return;
         }
         if (window.confirm('Are you sure you want to DELETE this pending booking? This action cannot be undone.')) {
            deleteBookingMutation.mutate(booking.id); // Call delete mutation
         }
     } else {
         // Attempt cancellation for other statuses
         if (!canCancelBookings) {
             toast.error("You don't have permission to cancel this booking.");
             return;
         }
         if (window.confirm('Are you sure you want to CANCEL this booking?')) {
            try {
                // Call the RPC mutation, passing the argument as an object
                await cancelBookingMutation.mutateAsync({ id: booking.id });
                // Success toast handled by the hook
            } catch (error: any) {
                // Error toast handled by the hook
                console.error("Cancellation failed in component:", error);
            }
         }
     }
  };

  // Handler for updating status
  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
      console.log(`[BookingList] Attempting status update for ${id} to ${newStatus}`);
      try {
          await updateStatusMutation.mutateAsync({ id, newStatus });
          // Success toast handled by hook
      } catch(error) {
          // Error toast handled by hook
          console.error("Status update failed in component:", error);
      }
  };

  // *** NEW Handler for marking as paid ***
  const handleMarkAsPaid = async (booking: Booking) => {
     if (!canMarkPaid) {
         toast.error("You don't have permission to mark bookings as paid.");
         return;
     }
     // Optional: Confirm action
     // if (!window.confirm(`Mark booking #${booking.booking_number} for ${booking.guest_name} as Paid?`)) {
     //     return;
     // }
     console.log(`[BookingList] Attempting to mark booking ${booking.id} as paid.`);
     try {
         await markAsPaidMutation.mutateAsync({ id: booking.id });
         // Success toast handled by hook
         // Note: The DB trigger should automatically update booking_status to 'confirmed'
     } catch (error) {
         // Error toast handled by hook
         console.error("Mark as paid failed in component:", error);
     }
  };

  const handleViewBooking = (id: string) => {
    navigate(`/bookings/${id}`);
  };
  // --- End Handlers ---

  // Render loading state AFTER hooks
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle><h1 className="text-2xl font-bold">Bookings</h1></CardTitle></CardHeader>
        <CardContent><div className="py-8 text-center text-muted-foreground">Loading...</div></CardContent>
      </Card>
    );
  }

  // Render access denied AFTER hooks and loading check
  if (!canViewBookings) {
    return (
       <div className="container mx-auto py-10">
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Access Denied</AlertTitle>
           <AlertDescription>
             You do not have permission to view bookings.
           </AlertDescription>
         </Alert>
       </div>
    );
  }

  // Render error state AFTER hooks and loading check
  if (bookingsError) {
    console.error("Error loading bookings:", bookingsError.message);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-red-500">
            Error loading bookings: {bookingsError.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-3xl font-bold">Bookings</CardTitle>
        

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          {/* Add search input here if needed */}
          {canAddBookings && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddBooking}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Booking
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeaderComponent>
                  <DialogTitle>Create New Booking</DialogTitle>
                  <DialogDescription> Add new booking details below. Click save when you're done.</DialogDescription>
                </DialogHeaderComponent>
                <BookingForm
                  onSuccess={(bookingId) => {
                    console.log('Booking created successfully! ID:', bookingId);
                    setIsCreateDialogOpen(false);
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isEditMode={false}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
         {filteredBookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchQuery ? 'No bookings match your search.' : 'No bookings found.'}
          </div>
        ) : (
          <BookingListTable
            bookings={filteredBookings ?? []}
            isLoading={isLoading}
            onView={handleViewBooking}
            onEdit={handleEditBooking}
            onCancelOrDelete={handleCancelOrDelete}
            onMarkAsPaid={handleMarkAsPaid} // Pass the implemented handler
            onUpdateStatus={handleUpdateStatus}
            // Pass permissions needed by the table actions
            canEdit={canEditBookings || canAddBookings}
            canDelete={canDeleteBookings}
            canCancel={canCancelBookings}
            canView={canViewBookings}
            canMarkPaid={canMarkPaid} // Pass down mark paid permission
          />
        )}
      </CardContent>
    </Card>
  );
};
