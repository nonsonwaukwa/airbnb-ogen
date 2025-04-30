import type { Session, User } from '@supabase/supabase-js';

// Re-export for convenience
export type SupabaseSession = Session;
export type SupabaseUser = User;

// Define the possible authentication stages
export type AuthStage = 'loading' | 'needs_password_set' | 'authenticated' | 'unauthenticated';

// Based on public.profiles table
export interface DbUserProfile {
  id: string; // UUID maps to string
  role_id: string; // UUID maps to string
  full_name: string;
  phone: string | null;
  email: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: string; // TIMESTAMPTZ maps to string
  updated_at: string; // TIMESTAMPTZ maps to string
  employment_date: string | null; // DATE maps to string
}

// Based on public.roles table
export interface DbRole {
  id: string; // UUID maps to string
  name: string;
  description?: string;
  created_at: string; // TIMESTAMPTZ maps to string
  updated_at: string; // TIMESTAMPTZ maps to string
}

// Map of permission keys to boolean values
export type PermissionsMap = {
  [key: string]: boolean;
};

// Structure returned by the get_user_auth_details RPC function
export interface UserAuthDetails {
  profile: DbUserProfile;
  role: DbRole;
  permissions: PermissionsMap;
}

// Type for the Auth Context provider state
export interface AuthContextType {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  profile: DbUserProfile | null;
  role: DbRole | null;
  permissions: PermissionsMap;
  loading: boolean; // Indicates if auth state and profile/permissions are being loaded
  authStage: AuthStage; // Added authStage
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

// Define available permissions
export const PERMISSIONS = {
  // ISSUES: { // Removing this block
  //   VIEW: 'issues.view',
  //   CREATE: 'issues.create',
  //   EDIT: 'issues.edit',
  //   DELETE: 'issues.delete',
  //   ASSIGN: 'issues.assign',
  // },
  // Add other permission groups as needed (if any were defined)
} as const; 