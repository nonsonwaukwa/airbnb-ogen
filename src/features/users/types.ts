export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id?: string;
  phone?: string | null;
  avatar_url?: string;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
} 