import type { DbUserProfile } from '@/types/auth';
import type { Property } from '@/features/properties/types'; // Import Property type for relation

// Based on public.bookings table from Phase 3.1.1
export interface Booking {
  id: string; // UUID
  booking_number: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  platform: string | null; // e.g., 'Airbnb', 'Booking.com', 'Direct'
  property_id: string | null; // UUID
  checkin_datetime: string; // TIMESTAMPTZ
  checkout_datetime: string; // TIMESTAMPTZ
  number_of_guests: number;
  amount: number | null; // NUMERIC
  currency: string | null;
  payment_status: string; // e.g., 'pending', 'paid', 'partially_paid', 'refunded'
  booking_status: string; // e.g., 'pending', 'confirmed', 'cancelled', 'completed', 'no-show'
  payment_method: string | null; // e.g., 'card', 'bank_transfer', 'cash'
  notes: string | null;
  created_by_user_id: string | null; // UUID
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ

  // Optional related data (if fetched with joins)
  property?: Pick<Property, 'id' | 'name'> | null;
  created_by?: Pick<DbUserProfile, 'id' | 'full_name' | 'email'> | null;
  // Add booking images
  images?: BookingImage[];
}

// Based on public.booking_images table (similar to property_images)
export interface BookingImage {
  id: string; // UUID
  booking_id: string; // UUID
  image_url: string;
  order: number;
  uploaded_at: string; // TIMESTAMPTZ maps to string
}

// Payload for creating a booking
// Omit auto-generated fields like id, booking_number, created_at, updated_at
export type CreateBookingPayload = Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'property' | 'created_by' | 'images'> & {
  imageFiles?: File[]; // For handling image uploads
};

// Payload for updating a booking
// Allow partial updates, but require ID
export interface UpdateBookingPayload extends Partial<Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'property' | 'created_by' | 'images' | 'booking_status'>> {
  id: string; // ID is required for update
  booking_status?: string; // Add optional booking_status for specific updates
  // Image handling fields
  newImageFiles?: File[];
  deletedImageIds?: string[];
}

// Specific payload for cancelling (e.g., status update)
export interface CancelBookingPayload {
    id: string;
    // Potentially add a reason or specific status update field if needed
    // For now, the hook might just update status directly or delete
} 