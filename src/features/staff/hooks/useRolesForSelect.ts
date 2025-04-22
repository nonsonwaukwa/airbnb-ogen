import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';

interface RoleOption {
  id: string;
  name: string;
}

const fetchRolesForSelect = async (): Promise<RoleOption[]> => {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching roles for select:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const useGetRolesForSelect = () => {
  return useQuery<RoleOption[], Error>({
    queryKey: ['roles', 'select'], // Simple query key for now
    queryFn: fetchRolesForSelect,
    staleTime: 60 * 60 * 1000, // Cache roles for an hour
  });
}; 