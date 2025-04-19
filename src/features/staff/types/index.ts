import type { DbUserProfile, DbRole } from '@/types/auth';

// Type for displaying staff in a list, joining profile and role name
export interface StaffMember extends Omit<DbUserProfile, 'role_id'> {
  role: Pick<DbRole, 'id' | 'name'> | null; // Include role id and name
}

// Type for the Staff form (used for create/invite and update)
// Omit fields automatically handled or not directly editable in the main form
export interface StaffFormValues {
  id?: string; // Present when updating
  email: string; // Required for invite, read-only for update
  full_name: string;
  phone: string | null;
  role_id: string; // Selected role ID
  employment_date: Date | string | null; // Use Date object for picker, allow string/null
  status: 'active' | 'inactive'; // Only relevant for update
}

// Type for the payload sent to the invite function/mutation
export interface InviteStaffPayload {
  email: string;
  full_name: string;
  phone: string | null;
  role_id: string;
  employment_date: string | null; // Send as ISO string maybe
}

// Type for the payload sent to the update function/mutation
// Allow partial updates
export type UpdateStaffPayload = Partial<Omit<StaffFormValues, 'email'>> & {
    id: string; // ID is required for update
    employment_date?: string | null; // Ensure date matches expected format
};

// Type for the payload sent to the deactivate function/mutation
export interface DeactivateStaffPayload {
  id: string;
  status: 'inactive'; // Explicitly setting status
} 