// src/features/roles/types/index.ts
import type { DbRole as BaseDbRole } from '@/types/auth'; // Reuse base role type if suitable

// Extend base role if needed, or use as is
export interface Role extends BaseDbRole {
  // Add any additional fields specific to the role management view if necessary
}

// Type for a permission entry, typically fetched for display in the form
export interface Permission {
  id: string;
  description: string | null;
  category: string | null;
}

// Type for a role with its associated permission IDs (fetched for editing)
export interface RoleWithPermissions extends Role {
  permissionIds: string[]; // Array of permission IDs associated with this role
}

// Type for the payload when creating a new role
export interface CreateRolePayload {
  name: string;
  description: string | null;
  permissionIds: string[]; // Array of permission IDs to link
}

// Type for the payload when updating a role
export interface UpdateRolePayload extends CreateRolePayload {
  id: string; // ID is required for update
}

// Type for the payload when deleting a role
export interface DeleteRolePayload {
  id: string;
} 