import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types'; // Assuming types are in ../types
import { toast } from 'sonner';

const SUPPLIER_QUERY_KEY = 'suppliers';

// == Query Functions ==

const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const getSupplier = async (id: string): Promise<Supplier | null> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data;
};

// == Mutation Functions ==

const createSupplier = async (payload: CreateSupplierPayload): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(payload)
    .select()
    .single();

  if (error) {
      // Check for unique constraint violation (e.g., duplicate name or email)
      if (error.code === '23505') { // Postgres unique violation code
          if (error.message.includes('suppliers_name_key')) {
              throw new Error('A supplier with this name already exists.');
          }
          if (error.message.includes('suppliers_email_key')) {
              throw new Error('A supplier with this email already exists.');
          }
      }
      throw new Error(error.message);
  }
  if (!data) throw new Error('Failed to create supplier, no data returned.');
  return data;
};

const updateSupplier = async (payload: UpdateSupplierPayload): Promise<Supplier> => {
  const { id, ...updateData } = payload;
  const { data, error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
     if (error.code === '23505') { // Postgres unique violation code
          if (error.message.includes('suppliers_name_key')) {
              throw new Error('A supplier with this name already exists.');
          }
          if (error.message.includes('suppliers_email_key')) {
              throw new Error('A supplier with this email already exists.');
          }
      }
      throw new Error(error.message);
  }
  if (!data) throw new Error('Failed to update supplier, no data returned.');
  return data;
};

const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// == React Query Hooks ==

export const useGetSuppliers = () => {
  return useQuery<Supplier[], Error>({
    queryKey: [SUPPLIER_QUERY_KEY],
    queryFn: getSuppliers,
  });
};

export const useGetSupplier = (id: string | null) => {
  return useQuery<Supplier | null, Error>({
    queryKey: [SUPPLIER_QUERY_KEY, id],
    queryFn: () => (id ? getSupplier(id) : Promise.resolve(null)),
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation<Supplier, Error, CreateSupplierPayload>({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEY] });
      toast.success('Supplier created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create supplier: ${error.message}`);
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation<Supplier, Error, UpdateSupplierPayload>({
    mutationFn: updateSupplier,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEY, data.id] });
      // Optionally update cache directly
      // queryClient.setQueryData([SUPPLIER_QUERY_KEY, data.id], data);
      toast.success('Supplier updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update supplier: ${error.message}`);
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSupplier,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: [SUPPLIER_QUERY_KEY, id] });
      toast.success('Supplier deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete supplier: ${error.message}`);
    },
  });
}; 