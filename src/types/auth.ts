import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

// Re-export for convenience
export type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

// Define the possible authentication stages
export type AuthStage = 'loading' | 'needs_password_set' | 'authenticated' | 'unauthenticated';

// Based on public.profiles table
export interface DbUserProfile {
  id: string; // UUID maps to string
  role_id: string | null; // UUID maps to string
  full_name: string;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  status: 'pending' | 'active' | 'inactive';
  created_at: string; // TIMESTAMPTZ maps to string
  updated_at: string; // TIMESTAMPTZ maps to string
  employment_date: string | null; // DATE maps to string
}

// Based on public.roles table
export interface DbRole {
  id: string; // UUID maps to string
  name: string;
  description: string | null;
  created_at: string; // TIMESTAMPTZ maps to string
  updated_at: string; // TIMESTAMPTZ maps to string
}

// Map of permission IDs to boolean (e.g., { "view_staff": true })
export type PermissionsMap = Record<string, boolean>;

// Structure returned by the get_user_auth_details RPC function
export interface UserAuthDetails {
  profile: DbUserProfile | null;
  role: DbRole | null;
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
} 