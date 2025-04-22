import type { DbUserProfile } from '@/types/auth'; // If needed for created_by/updated_by relations later

// Based on public.suppliers table from Phase 2.1.2
export interface Supplier {
  id: string; // UUID
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_lga: string | null;
  address_state: string | null;
  category: string | null; // e.g., Plumbing, Electrical, Cleaning
  notes: string | null;
  status: string; // e.g., active, inactive
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// Payload for creating a supplier
export type CreateSupplierPayload = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;

// Payload for updating a supplier
export interface UpdateSupplierPayload extends Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>> {
  id: string; // ID is required for update
} 