import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/config/supabaseClient';
// Assuming types are correctly defined in this path relative to useInventory.ts
import {
  InventoryItem,
  StockAdjustment,
  CreateStockAdjustmentDTO,
  CatalogItem,
  CreateCatalogItemDTO, // Make sure this type includes price/currency
  UpdateCatalogItemDTO, // Make sure this type includes price/currency
} from '../types'; // Adjusted path assuming types are in ../types

// --- Inventory Item Hooks ---

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
            low_stock_threshold,
            last_purchase_price, /* Added */
            currency /* Added */
          ),
          property:property_id(name)
        `)
        .order('last_updated_at', { ascending: false });

      if (error) throw error;
      // Note: Casting might need adjustment if InventoryItem type doesn't expect nested catalog details fully
      return data as unknown as InventoryItem[];
    },
  });
};

export const useGetInventoryItem = (itemId: string, propertyId?: string) => {
  return useQuery({
    queryKey: ['inventory-items', itemId, propertyId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          item_catalog!inner(
            id,
            name,
            description,
            category,
            unit_of_measure,
            low_stock_threshold,
            last_purchase_price, /* Added */
            currency /* Added */
          ),
          property:property_id(name)
        `)
        .eq('item_catalog_id', itemId);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else {
        // If no propertyId, maybe fetch the first one or handle differently?
        // For now, fetching a single one might error if multiple exist without propertyId filter.
        // Consider if this use case needs adjustment.
      }


      const { data, error } = await query.maybeSingle(); // Use maybeSingle to avoid error if no item exists yet

      if (error) throw error;
      return data as InventoryItem | null; // Allow null if no specific item/property combo exists
    },
    enabled: !!itemId, // Only run if itemId is provided
  });
};

// --- Stock Adjustment Hooks ---

export const useGetStockAdjustments = () => {
  return useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          item_catalog(name, unit_of_measure),
          property:property_id(name), /* Correct alias */
          staff:staff_id(full_name) /* Correct alias */
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      // Note: Casting might need adjustment based on exact StockAdjustment type definition
      return data as unknown as StockAdjustment[];
    },
  });
};

// Note: DTO was defined differently in user prompt, using the type from ../types now
export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Use the DTO defined in types
    mutationFn: async (adjustmentData: CreateStockAdjustmentDTO) => {
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Prepare data for insertion, ensuring quantity_change sign is correct
      const quantity_change = (adjustmentData.adjustment_type === 'Manual Remove' || adjustmentData.adjustment_type === 'Damage')
        ? -Math.abs(adjustmentData.quantity_change) // Ensure negative for removals
        : Math.abs(adjustmentData.quantity_change); // Ensure positive for additions

      const insertData = {
        ...adjustmentData,
        quantity_change, // Use the calculated value
        staff_id: user.id, // Add staff_id
        // created_at is handled by the database default
      };

      const { error } = await supabase
        .from('stock_adjustments')
        .insert([insertData]); // Pass the prepared data object

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      toast.success('Stock adjustment saved successfully');
    },
    onError: (error: any) => {
      console.error('Error creating stock adjustment:', error);
      // Provide specific feedback if it's the insufficient stock error
      const errorMessage = error?.message?.includes('Insufficient stock')
        ? error.message // Show the specific DB error message
        : error?.message || 'Failed to save stock adjustment'; // Fallback generic message
      toast.error(errorMessage);
    },
  });
};


// --- Item Catalog Hooks ---

export const useGetCatalogItems = () => {
  return useQuery({
    queryKey: ['item-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_catalog')
        .select('*') // Select all columns, including new ones
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CatalogItem[]; // Cast to the updated CatalogItem type
    },
  });
};

// Optional: Hook to get a single catalog item
export const useGetCatalogItem = (id: string | undefined) => {
  return useQuery({
    queryKey: ['item-catalog', id],
    queryFn: async () => {
      if (!id) return null; // Don't fetch if no ID
      const { data, error } = await supabase
        .from('item_catalog')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Handle case where item might not be found gracefully
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as CatalogItem;
    },
    enabled: !!id, // Only run query if id is truthy
  });
};


export const useCreateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Ensure this uses the correct DTO that includes price/currency
    mutationFn: async (itemData: CreateCatalogItemDTO) => {
      // The itemData object coming from the form (after Zod validation)
      // should already contain last_purchase_price and currency (or null)
      console.log("Creating catalog item with data:", itemData); // Debug log
      const { error } = await supabase
        .from('item_catalog')
        .insert([itemData]); // Insert the data directly

      if (error) {
        console.error("Supabase insert error:", error); // Log Supabase error
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-catalog'] }); // Refetch catalog list
      toast.success('Catalog item created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating catalog item:', error);
      toast.error(error?.message || 'Failed to create catalog item');
    },
  });
};

export const useUpdateCatalogItem = () => { // Removed id parameter, should be part of input object
  const queryClient = useQueryClient();

  return useMutation({
    // Input should be an object containing the id and the update data
    mutationFn: async ({ id, ...updateData }: { id: string } & UpdateCatalogItemDTO) => {
      // updateData should include any changed fields, including last_purchase_price and currency
      console.log(`Updating catalog item ${id} with data:`, updateData); // Debug log
      const { error } = await supabase
        .from('item_catalog')
        .update(updateData)
        .eq('id', id); // Specify which item to update

      if (error) {
         console.error("Supabase update error:", error); // Log Supabase error
         throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate specific item query if needed, or just the list
      queryClient.invalidateQueries({ queryKey: ['item-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['item-catalog', variables.id] }); // Invalidate single item query
      toast.success('Catalog item updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating catalog item:', error);
      toast.error(error?.message || 'Failed to update catalog item');
    },
  });
};

// Optional: Hook to delete a catalog item (consider implications on related data)
export const useDeleteCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Consider implications: What happens to inventory_items, stock_adjustments, PO lines?
      // ON DELETE CASCADE on inventory_items handles that link.
      // PO lines might need ON DELETE SET NULL or restrict deletion if linked.
      const { error } = await supabase
        .from('item_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-catalog'] });
      toast.success('Catalog item deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting catalog item:', error);
      toast.error(error?.message || 'Failed to delete catalog item');
    },
  });
};

// Removed the redundant useUpdateItemCatalog hook

