import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type {
  StaffMember,
  InviteStaffPayload,
  UpdateStaffPayload,
  DeactivateStaffPayload,
} from '@/features/staff/types';

// Query Key Factory
const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (filters: string) => [...staffKeys.lists(), { filters }] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
};

// --- Fetching Hooks ---

/**
 * Fetches a list of all staff members with their role names.
 */
const fetchStaffList = async (): Promise<StaffMember[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      email,
      avatar_url,
      status,
      created_at,
      updated_at,
      employment_date,
      roles ( id, name )
    `)
    .order('created_at', { ascending: false }); // Example ordering

  if (error) {
    console.error('Error fetching staff list:', error);
    throw new Error(error.message);
  }

  // Map Supabase response to StaffMember type
  // Handle cases where roles might be null or an array
  return data.map(profile => {
    // Supabase join returns an array, even for a single related record
    const roleData = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
    return {
      ...profile,
      // Explicitly cast to the expected type after checking
      role: roleData ? { id: roleData.id, name: roleData.name } as StaffMember['role'] : null,
    };
  }) || []; // Return empty array if data is null
};

export const useGetStaffList = () => {
  return useQuery<StaffMember[], Error>({
    queryKey: staffKeys.lists(),
    queryFn: fetchStaffList,
    // staleTime: 5 * 60 * 1000, // Optional: Cache data for 5 minutes
  });
};

/**
 * Fetches details for a single staff member by ID.
 */
const fetchStaffMember = async (staffId: string): Promise<StaffMember | null> => {
  if (!staffId) return null; // Return null if no ID is provided

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      email,
      avatar_url,
      status,
      created_at,
      updated_at,
      employment_date,
      roles ( id, name )
    `)
    .eq('id', staffId)
    .single(); // Expect a single result

  if (error) {
    // If error is 'PGRST116', it means no rows found, which is not a true "error"
    if (error.code === 'PGRST116') {
      console.warn(`Staff member with ID ${staffId} not found.`);
      return null;
    }
    // Otherwise, it's a real error
    console.error(`Error fetching staff member ${staffId}:`, error);
    throw new Error(error.message);
  }

  if (!data) return null; // Should be caught by PGRST116, but good practice

  // Map Supabase response to StaffMember type
  const roleData = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const staffMember: StaffMember = {
      ...data,
      role: roleData ? { id: roleData.id, name: roleData.name } as StaffMember['role'] : null,
  };

  return staffMember;
};

/**
 * React Query hook to fetch a single staff member's details.
 */
export const useGetStaffMember = (staffId: string | null | undefined) => {
  return useQuery<StaffMember | null, Error>({
    queryKey: staffKeys.detail(staffId ?? 'NULL'), // Use 'NULL' or similar if id is null/undefined
    queryFn: () => fetchStaffMember(staffId!), // Use non-null assertion as enabled handles null case
    enabled: !!staffId, // Only run the query if staffId is truthy
    staleTime: 5 * 60 * 1000, // Optional: Cache for 5 minutes
  });
};

// Note: useGetStaffMember hook (fetching single profile) might be redundant
// if all necessary data is in the list query. It can be added later if needed.

/**
 * Fetch a simplified list of active staff members for selection dropdowns.
 */
export const useGetStaffForSelect = () => {
    const selectString = 'id, full_name';

    const fetchStaff = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select(selectString)
            .eq('status', 'Active') // Only fetch active staff
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching staff for select:', error);
            throw new Error(error.message);
        }
        return data || [];
    };

    const queryKey = ['staff', 'selectList'];

    return useQuery({
        queryKey: queryKey,
        queryFn: fetchStaff,
        staleTime: 1000 * 60 * 15, // 15 minutes stale time
    });
};

// --- Mutation Hooks ---

/**
 * Invites a new staff member via Edge Function.
 */
const inviteStaff = async (payload: InviteStaffPayload) => {
  const { data, error } = await supabase.functions.invoke('invite-staff', {
    body: payload,
  });

  if (error) {
    console.error('Error inviting staff:', error);
    // Attempt to parse Supabase function error details if available
    const errorMessage = data?.error?.message || error.message || 'Failed to invite staff member.';
    throw new Error(errorMessage);
  }

  if (data?.error) {
     console.error('Error returned from invite-staff function:', data.error);
     throw new Error(data.error.message || 'An error occurred in the invite function.');
  }

  console.log('Invite staff response:', data);
  return data; // Or return something more specific if the function returns useful data
};

export const useInviteStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteStaff,
    onSuccess: () => {
      // Invalidate the staff list cache to refetch updated data
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    },
    onError: (error) => {
       // Error handling is often done via toast in the component calling the mutation
       console.error("Mutation error (inviteStaff):", error.message);
    }
  });
};

/**
 * Updates an existing staff member's profile.
 */
const updateStaff = async (payload: UpdateStaffPayload) => {
  const { id, ...updateData } = payload;

  if (!id) {
    throw new Error('Staff ID is required for update.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select() // Select the updated row
    .single(); // Expect a single row back

  if (error) {
    console.error('Error updating staff:', error);
    throw new Error(error.message);
  }

  return data;
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    },
    onError: (error) => {
       console.error("Mutation error (updateStaff):", error.message);
    }
  });
};

/**
 * Deactivates a staff member (sets status to 'inactive').
 */
const deactivateStaff = async (payload: DeactivateStaffPayload) => {
  const { id } = payload;

  // Explicitly set status to inactive
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: 'inactive' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating staff:', error);
    throw new Error(error.message);
  }

  return data;
};

export const useDeactivateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    },
     onError: (error) => {
       console.error("Mutation error (deactivateStaff):", error.message);
    }
  });
}; 