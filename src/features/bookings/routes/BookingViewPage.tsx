import { useParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';
import { useGetBooking } from '../hooks/useBookings';
import { BookingDetail } from '../components/BookingDetail';
import AccessDenied from '@/components/AccessDenied'; // Assuming a generic AccessDenied component exists
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export function BookingViewPage() {
    const { id } = useParams<{ id: string }>();
    const { permissions } = useAuth();
    const { data: booking, isLoading, error } = useGetBooking(id ?? null); // Fetch the specific booking

    // 3.2.5 Permissions Check: Check if user has permission to view bookings
    if (!permissions.view_bookings) {
        return <AccessDenied />;
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="container mx-auto py-6 text-destructive">
                Error loading booking: {error.message}
             </div>
        );
    }

     if (!booking) {
        return (
            <div className="container mx-auto py-6 text-center">
                Booking not found.
            </div>
        );
    }

    // TODO: Add Edit/Cancel buttons here if not handled solely within the table/list view
    // Example:
    // {permissions.edit_bookings && <Button>Edit</Button>}
    // {permissions.delete_bookings && <Button variant="destructive">Cancel</Button>}

    return (
        <div className="container mx-auto py-6">
             {/* Maybe add Breadcrumbs or Back button here - Note: Back button is now in BookingDetail */}
            <BookingDetail booking={booking} />
        </div>
    );
} 