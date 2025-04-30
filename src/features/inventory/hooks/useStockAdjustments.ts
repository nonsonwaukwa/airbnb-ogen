import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthProvider'; // Import useAuth to get the current user ID

// --- Types ---

// Type for the data coming FROM the form
// Uses positive quantity and adjustment type string
interface StockAdjustmentFormInput {
  item_catalog_id: string;
  property_id: string | null; // Allow null for central warehouse/unassigned
  quantity: number; // Positive quantity entered by user
  adjustment_type: 'Manual Add' | 'Manual Remove' | 'Initial Stock' | 'Damage'; // Types allowed from manual form
  notes?: string | null;
  unit_price?: number | null; // Optional cost tracking
  currency?: string | null; // Optional cost tracking
}

// Type for the data being INSERTED into the database table
// Uses signed quantity_change and includes staff_id
interface StockAdjustmentPayload {
  item_catalog_id: string;
  property_id: string | null;
  adjustment_type: string;
  quantity_change: number; // Signed value (+ or -)
  unit_price?: number | null;
  currency?: string | null;
  notes?: string | null;
  staff_id: string; // ID of the user making the adjustment
  // date is defaulted by DB, created_at is defaulted by DB
  // related_procurement_id/related_sale_id are not set by manual adjustments
}


// Type for data returned by the history query (adjust based on actual select)
interface StockAdjustmentHistoryRecord {
  id: string;
  item_catalog_id: string;
  property_id: string | null;
  quantity_change: number;
  adjustment_type: string;
  unit_price?: number | null;
  currency?: string | null;
  notes?: string | null;
  staff_id: string; // Changed from created_by for consistency with table
  created_at: string;
  // Joined data (ensure select matches)
  profile?: { // Changed from profiles for clarity
    id: string;
    full_name: string | null; // Match profiles table
    // email: string; // Removed if not selected
  } | null; // Profile might be null if staff_id doesn't match
  item_catalog?: {
    name: string;
  } | null;
  property?: { // Changed from property for clarity
    name: string;
  } | null;
}

// --- Hooks ---

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get current user

  return useMutation<any, Error, StockAdjustmentFormInput>({ // Input type is FormInput
    mutationFn: async (formData: StockAdjustmentFormInput) => {
      if (!user) {
        throw new Error("User not authenticated to perform stock adjustment.");
      }

      // Calculate the signed quantity_change based on adjustment type
      let quantity_change: number;
      if (formData.adjustment_type === 'Manual Remove' || formData.adjustment_type === 'Damage') {
        quantity_change = -Math.abs(formData.quantity); // Ensure it's negative
      } else {
        quantity_change = Math.abs(formData.quantity); // Ensure it's positive ('Manual Add', 'Initial Stock')
      }

      // Prepare the payload for the database insert
      const payload: StockAdjustmentPayload = {
        item_catalog_id: formData.item_catalog_id,
        property_id: formData.property_id || null, // Ensure null if empty/undefined
        adjustment_type: formData.adjustment_type,
        quantity_change: quantity_change, // Use the calculated signed value
        unit_price: formData.unit_price || null,
        currency: formData.currency || null,
        notes: formData.notes || null,
        staff_id: user.id, // Use the logged-in user's ID
      };

      console.log("Inserting stock adjustment:", payload); // Log payload before insert

      // Insert the prepared payload
      const { error } = await supabase
        .from('stock_adjustments')
        .insert([payload]); // Insert the payload with correct fields

      if (error) {
          console.error("Supabase insert error:", error);
          throw error; // Re-throw Supabase error
      }
      // No need to return data usually for simple insert confirmation
    },
    onSuccess: () => {
      // Invalidate queries related to inventory levels and potentially adjustment history
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }); // Invalidate history query too
      toast.success('Stock adjustment saved successfully');
    },
    onError: (error) => {
      console.error('Error creating stock adjustment:', error);
      toast.error(`Failed to save stock adjustment: ${error.message}`);
    },
  });
}

// Hook for fetching adjustment history
export const useGetStockAdjustmentHistory = (itemId?: string, propertyId?: string) => {
  return useQuery<StockAdjustmentHistoryRecord[], Error>({ // Use the refined Record type
    queryKey: ['stock-adjustments', itemId, propertyId],
    queryFn: async () => {
      // Ensure itemId is provided before querying
      if (!itemId) return [];

      let query = supabase
        .from('stock_adjustments')
        .select(`
          *,
          profile:profiles!staff_id(id, full_name), 
          item_catalog:item_catalog_id(name),
          property:properties!property_id(name)
        `)
        .eq('item_catalog_id', itemId)
        .order('created_at', { ascending: false }); // Order by creation time

      // Add property filter if provided
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) {
          console.error("Error fetching stock adjustment history:", error);
          throw error;
      }
      // Cast data to the specific type, default to empty array if null
      return (data as StockAdjustmentHistoryRecord[] | null) ?? [];
    },
    // Enable query only if itemId is provided
    enabled: !!itemId
  });
};


 
 