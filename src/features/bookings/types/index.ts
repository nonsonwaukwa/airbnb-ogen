import type { DbUserProfile } from '@/types/auth';
import type { Property } from '@/features/properties/types'; // Import Property type for relation

// Define the possible booking statuses
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed' | 'no-show'; // Added 'completed','no-show'

// Define the possible payment statuses
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'cancelled'; // Based on usage

// Based on public.bookings table from Phase 3.1.1
export interface Booking {
  booking_status: string;
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
  payment_status: PaymentStatus;
  status: BookingStatus; // Renamed from booking_status for consistency
  payment_method: string | null; // e.g., 'card', 'bank_transfer', 'cash'
  notes: string | null;
  created_by_user_id: string | null; // UUID
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ

  // Optional related data (if fetched with joins)
  property?: Pick<Property, 'id' | 'name'> | null;
  created_by?: Pick<DbUserProfile, 'id' | 'full_name' | 'email'> | null;
  // Add booking images
  images: BookingImage[]; // Make non-optional, default to [] if none
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
export interface CreateBookingPayload extends Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'property' | 'created_by' | 'images' | 'status' | 'payment_status' | 'property_id' | 'amount' | 'currency'> {
  // Explicitly define required fields for creation, allow others to be optional from Booking base
  guest_name: string;
  checkin_datetime: string;
  checkout_datetime: string;
  number_of_guests: number;
  property_id?: string | null; // Optional if direct booking without property initially
  amount?: number | null;
  currency?: string | null;
  status?: BookingStatus; // Default might be handled by DB
  payment_status?: PaymentStatus; // Default might be handled by DB
  imageFiles?: File[]; // For handling image uploads
}

// Payload for updating a booking
// Allow partial updates, but require ID
export interface UpdateBookingPayload extends Partial<Omit<Booking, 'id' | 'booking_number' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'property' | 'created_by' | 'images'>> {
  id: string; // ID is required for update
  status?: BookingStatus; // Renamed from booking_status and typed
  booking_status?: BookingStatus; // Add back for direct DB update compatibility
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