import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '../types';

export function useGetUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as User[];
    }
  });
} 