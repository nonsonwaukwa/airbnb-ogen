import React, { useState, useMemo } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import { Plus, PlusCircle } from 'lucide-react';
import { toast } from 'sonner'; // Import toast from sonner

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { useGetBookings, useCancelBooking } from '../hooks/useBookings';
import { BookingListTable } from './BookingListTable'; // The refactored table component
import type { Booking } from '../types'; // Import Booking type
import { Dialog, DialogContent, DialogDescription, DialogHeader as DialogHeaderComponent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookingForm } from './BookingForm';
import { useAuth } from '@/app/AuthProvider';

export const BookingList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: bookings = [], isLoading, error } = useGetBookings();
  console.log("useGetBookings result:", { bookings, isLoading, error }); // Keep debug log
  const cancelBookingMutation = useCancelBooking();

  // Filter bookings based on search query
  const filteredBookings = useMemo(() => {
    const safeBookings = bookings ?? []; // Ensure we always start with an array
    if (!searchQuery) {
        return safeBookings;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return safeBookings.filter((booking) =>
        booking.guest_name?.toLowerCase().includes(lowerCaseQuery) ||
        booking.booking_number?.toLowerCase().includes(lowerCaseQuery) ||
        booking.property?.name?.toLowerCase().includes(lowerCaseQuery)
      );
  }, [bookings, searchQuery]); // Dependencies for filtering

  // --- Handlers defined in parent ---
  const handleAddBooking = () => {
    setIsCreateDialogOpen(true);
  };

  // Handler for editing (passed to table) - Accepts ID now
  const handleEditBooking = (id: string) => {
    console.log('[BookingList] Edit requested for:', id);
    const targetUrl = `/bookings/${id}/edit`;
    console.log('[BookingList] Navigating to:', targetUrl);
    navigate(targetUrl);
  };

  // Handler for deleting/cancelling (passed to table)
  const handleDeleteBooking = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      try {
        await cancelBookingMutation.mutateAsync(id); 
        // Use imported toast directly
        toast.success('Booking cancelled', {
          description: 'The booking has been successfully cancelled.',
        });
      } catch (error: any) {
        // Use imported toast directly
        toast.error('Error', {
          description: error?.message || 'Failed to cancel booking. Please try again.',
        });
      }
    }
  };

  // Handler for viewing (passed to table)
  const handleViewBooking = (id: string) => {
    console.log('View requested for:', id);
    navigate(`/bookings/${id}`);
  };
  // --- End Handlers ---

  if (error) {
    toast.error(`Failed to load bookings: ${error.message}`);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-red-500">
            Error loading bookings: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Bookings</CardTitle>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          
          {permissions.add_bookings && (
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
                  onSuccess={() => {
                    console.log('Booking created successfully!');
                    setIsCreateDialogOpen(false);
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchQuery ? 'No bookings match your search.' : 'No bookings found. Create your first booking.'}
          </div>
        ) : (
          <BookingListTable
            bookings={filteredBookings ?? []}
            isLoading={isLoading}
            onView={handleViewBooking}
            onEdit={handleEditBooking}
            onDelete={handleDeleteBooking}
          />
        )}
      </CardContent>
    </Card>
  );
};
