import { Routes, Route, useParams } from 'react-router-dom';
import { BookingList } from '../components/BookingList';
import { BookingForm } from '../components/BookingForm';
import { useGetBooking } from '../hooks/useBookings'; // Needed for Edit route helper
import { BookingViewPage } from './BookingViewPage'; // Import the page component
// import { BookingEditPage } from './BookingEditPage'; // Remove this
// import { BookingCreatePage } from './BookingCreatePage'; // Remove this

export function BookingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BookingList />} />
      {/* Use BookingViewPage directly */}
      <Route path="/:id" element={<BookingViewPage />} /> 
      {/* Keep using helper components for create/edit for now */}
      <Route path="/new" element={<BookingCreateRoute />} />
      <Route path="/:id/edit" element={<BookingEditRoute />} />
    </Routes>
  );
}

// Keep these helper components for now

// Removed BookingViewRoute as it's replaced by BookingViewPage

function BookingCreateRoute() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Booking</h1>
      <BookingForm />
    </div>
  );
}

function BookingEditRoute() {
  const { id } = useParams<{ id: string }>(); 
  // Log the ID received from useParams
  console.log('[BookingEditRoute] ID from useParams:', id);
  
  // Fetch booking using the id from params
  const { data: booking, isLoading, error } = useGetBooking(id ?? null); 

  if (isLoading) return <div className="p-4 text-center">Loading booking details...</div>;
  if (error) {
      console.error("[BookingEditRoute] Error fetching booking:", error);
      return <div className="p-4 text-center text-red-500">Error loading booking: {error.message}</div>;
  }
  if (!booking) return <div className="p-4 text-center">Booking not found</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Booking</h1>
      <BookingForm booking={booking} isEditMode />
    </div>
  );
} 