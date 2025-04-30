import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/config/supabaseClient';
import { InventoryItem, StockAdjustment } from '../types';

export const useGetInventoryItems = () => {
  return useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          item_catalog!inner(
            id,
            name,
            description,
            category,
            unit_of_measure,
            low_stock_threshold
          ),
          property:property_id(name)
        `)
        .order('last_updated_at', { ascending: false });

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
};

export const useGetInventoryItem = (itemId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['inventory-items', itemId, propertyId],
    queryFn: async () => {
      const query = supabase
        .from('inventory_items')
        .select(`
          *,
          item_catalog(
            name,
            description,
            unit_of_measure,
            low_stock_threshold
          ),
          property(name)
        `)
        .eq('item_catalog_id', itemId);

      if (propertyId) {
        query.eq('property_id', propertyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as InventoryItem;
    },
    enabled: !!itemId,
  });
};

export const useGetStockAdjustments = () => {
  return useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          item_catalog(name, unit_of_measure),
          property(name),
          staff:profiles(full_name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as StockAdjustment[];
    },
  });
};

export interface CreateStockAdjustmentDTO {
  item_catalog_id: string;
  property_id: string;
  quantity: number; // This is the form input, will be converted to quantity_change
  adjustment_type: 'Add Stock' | 'Remove Stock' | 'Initial Stock' | 'Damage/Write-off';
  unit_price?: number;
  currency?: string;
  notes?: string;
}

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStockAdjustmentDTO) => {
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Convert quantity to quantity_change based on adjustment type
      const quantity_change = (data.adjustment_type === 'Remove Stock' || data.adjustment_type === 'Damage/Write-off')
        ? -Math.abs(data.quantity) // Ensure negative for removals
        : Math.abs(data.quantity); // Ensure positive for additions

      const { error } = await supabase
        .from('stock_adjustments')
        .insert([{
          item_catalog_id: data.item_catalog_id,
          property_id: data.property_id,
          quantity_change,
          adjustment_type: data.adjustment_type,
          unit_price: data.unit_price,
          currency: data.currency,
          notes: data.notes,
          staff_id: user.id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      toast.success('Stock adjustment saved successfully');
    },
    onError: (error: any) => {
      console.error('Error creating stock adjustment:', error);
      // Check if it's a database error with a message
      const errorMessage = error?.message || 'Failed to save stock adjustment';
      toast.error(errorMessage);
    },
  });
}; 
 
 