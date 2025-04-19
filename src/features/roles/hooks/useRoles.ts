import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type {
  Role,
  Permission,
  RoleWithPermissions,
  CreateRolePayload,
  UpdateRolePayload,
  DeleteRolePayload
} from '@/features/roles/types';

// --- Query Key Factory ---
const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  permissions: ['permissions'] as const, // Separate key for all permissions
};

// --- Fetching Hooks ---

/**
 * 1.5.2.1: Fetches a list of all roles.
 */
const fetchRoles = async (): Promise<Role[]> => {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const useGetRoles = () => {
  return useQuery<Role[], Error>({
    queryKey: roleKeys.lists(),
    queryFn: fetchRoles,
  });
};

/**
 * 1.5.2.3: Fetches all available permissions, grouped by category.
 */
const fetchPermissions = async (): Promise<Permission[]> => {
  // Fetch all permissions ordered by category, then description for consistent display
  const { data, error } = await supabase
    .from('permissions')
    .select('id, description, category')
    .order('category', { ascending: true })
    .order('description', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const useGetPermissions = () => {
    return useQuery<Permission[], Error>({
        queryKey: roleKeys.permissions,
        queryFn: fetchPermissions,
        staleTime: Infinity, // Permissions rarely change, cache indefinitely
    });
};


/**
 * 1.5.2.2: Fetches a single role and its associated permission IDs.
 */
const fetchRoleWithPermissions = async (roleId: string): Promise<RoleWithPermissions | null> => {
    if (!roleId) return null;

    // Fetch role details
    const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .maybeSingle(); // Use maybeSingle to return null if not found

    if (roleError) throw new Error(roleError.message);
    if (!roleData) return null; // Role not found

    // Fetch associated permission IDs
    const { data: permissionData, error: permissionError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

    if (permissionError) throw new Error(permissionError.message);

    const permissionIds = permissionData?.map(p => p.permission_id) || [];

    return { ...roleData, permissionIds };
};

export const useGetRole = (roleId: string | null | undefined) => {
    return useQuery<RoleWithPermissions | null, Error>({
        queryKey: roleKeys.detail(roleId ?? 'NULL'),
        queryFn: () => fetchRoleWithPermissions(roleId!), // Non-null assertion okay due to `enabled`
        enabled: !!roleId, // Only run query if roleId is provided
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
};


// --- Mutation Hooks ---

/**
 * 1.5.2.4: Creates a new role and links permissions.
 * This needs to be transactional to ensure both inserts succeed or fail together.
 * Best handled by a Supabase DB Function (RPC).
 */
 const createRoleWithPermissions = async (payload: CreateRolePayload): Promise<any> => {
    // Call an RPC function that handles the transaction
    const { data, error } = await supabase.rpc('create_role_and_permissions', {
        p_role_name: payload.name,
        p_role_description: payload.description,
        p_permission_ids: payload.permissionIds
    });

    if (error) {
        console.error("Error in create_role_and_permissions RPC:", error);
        throw new Error(error.message || "Failed to create role.");
    }
    return data;
 }


export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, CreateRolePayload>({ // Define types for mutation function
    mutationFn: createRoleWithPermissions,
    onSuccess: () => {
      // Invalidate roles list and potentially details if needed
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
       // We might not know the new ID to invalidate specific details, so list invalidation is key.
    },
    onError: (error) => {
      console.error("Mutation error (createRole):", error.message);
      // Toast notification handled in the component
    }
  });
};


/**
 * 1.5.2.5: Updates an existing role and syncs permissions.
 * Also best handled by a Supabase DB Function (RPC) for transactional integrity.
 */
const updateRoleWithPermissions = async (payload: UpdateRolePayload): Promise<any> => {
    const { data, error } = await supabase.rpc('update_role_and_permissions', {
        p_role_id: payload.id,
        p_role_name: payload.name,
        p_role_description: payload.description,
        p_permission_ids: payload.permissionIds
    });
     if (error) {
        console.error("Error in update_role_and_permissions RPC:", error);
        throw new Error(error.message || "Failed to update role.");
    }
    return data;
}

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, UpdateRolePayload>({
    mutationFn: updateRoleWithPermissions,
    onSuccess: (_data, variables) => {
      // Invalidate list and the specific role detail
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
    },
     onError: (error) => {
      console.error("Mutation error (updateRole):", error.message);
    }
  });
};


/**
 * 1.5.2.6: Deletes a role. Cascade delete handles role_permissions.
 */
const deleteRole = async (payload: DeleteRolePayload): Promise<any> => {
    const { data, error } = await supabase
        .from('roles')
        .delete()
        .eq('id', payload.id);

     if (error) {
        console.error("Error deleting role:", error);
        throw new Error(error.message || "Failed to delete role.");
    }
    return data;
}

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, DeleteRolePayload>({
    mutationFn: deleteRole,
    onSuccess: (_data, variables) => {
      // Invalidate list and remove the specific role detail from cache
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.removeQueries({ queryKey: roleKeys.detail(variables.id) });
    },
     onError: (error) => {
      console.error("Mutation error (deleteRole):", error.message);
    }
  });
}; 