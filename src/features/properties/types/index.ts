import type { DbUserProfile } from '@/types/auth'; // Assuming this exists for created_by

// Based on public.properties table
export interface Property {
  id: string; // UUID
  name: string;
  address_street: string | null;
  address_city: string | null;
  address_lga: string | null;
  address_state: string | null;
  type: string | null; // e.g., 'Apartment', 'House', 'Duplex'
  status: string; // e.g., 'available', 'booked', 'maintenance'
  amenities: string[] | null; // Array of text
  base_rate_amount: number | null; // NUMERIC maps to number
  base_rate_currency: string | null; // e.g., 'NGN', 'USD'
  base_rate_per: string | null; // e.g., 'night', 'week', 'month'
  notes: string | null;
  created_by_user_id: string | null; // UUID
  created_at: string; // TIMESTAMPTZ maps to string
  updated_at: string; // TIMESTAMPTZ maps to string
  // Optionally include related data if fetched
  images?: PropertyImage[];
  created_by?: Pick<DbUserProfile, 'id' | 'full_name' | 'email'> | null; // Example of joined data
}

// Based on public.property_images table
export interface PropertyImage {
  id: string; // UUID
  property_id: string; // UUID
  image_url: string;
  order: number;
  uploaded_at: string; // TIMESTAMPTZ maps to string
}

// Payload for creating a property
export interface CreatePropertyPayload extends Omit<Property, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'images' | 'created_by'> {
  // Maybe specific handling for image uploads if needed separately
  imageFiles?: File[]; // Example: For handling uploads in the form
}

// Payload for updating a property
export interface UpdatePropertyPayload extends Partial<Omit<Property, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'images' | 'created_by'>> {
  id: string; // ID is required for update
  // Handling image additions/deletions might involve separate fields/logic
  newImageFiles?: File[];
  deletedImageIds?: string[];
} 