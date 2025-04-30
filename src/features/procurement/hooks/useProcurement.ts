import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';

export interface ProcurementOrder {
  id: string;
  order_number: string;
  order_date: string;
  supplier_id: string | null;
  property_id: string | null;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled' | 'Rejected';
  ordered_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  expected_delivery_date: string | null;
  date_received: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: {
    name: string;
  };
  property?: {
    name: string;
  };
  ordered_by?: {
    full_name: string;
  };
  approved_by?: {
    full_name: string;
  };
}

export interface ProcurementLineItem {
  id: string;
  procurement_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  item_catalog?: {
    name: string;
    unit_of_measure: string;
  };
}

interface CreateProcurementOrderDTO {
  supplier_id?: string;
  property_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  line_items: {
    item_id: string;
    quantity_ordered: number;
    unit_price?: number;
    currency?: string;
  }[];
}

interface UpdateProcurementOrderDTO {
  supplier_id?: string;
  property_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  status?: ProcurementOrder['status'];
}

interface UpdateLineItemDTO {
  quantity_ordered?: number;
  quantity_received?: number;
  unit_price?: number;
  currency?: string;
}

// Get list of procurement orders
export const useGetProcurementOrders = () => {
  return useQuery({
    queryKey: ['procurement-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_orders')
        .select(`
          *,
          supplier:suppliers(name),
          property:properties(name),
          ordered_by:profiles!ordered_by_user_id(full_name),
          approved_by:profiles!approved_by_user_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProcurementOrder[];
    }
  });
};

// Get single procurement order with line items
export const useGetProcurementOrder = (id?: string) => {
  return useQuery({
    queryKey: ['procurement-orders', id],
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from('procurement_orders')
        .select(`
          *,
          supplier:suppliers(name),
          property:properties(name),
          ordered_by:profiles!ordered_by_user_id(full_name),
          approved_by:profiles!approved_by_user_id(full_name)
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: lineItems, error: lineItemsError } = await supabase
        .from('procurement_line_items')
        .select(`
          *,
          item_catalog:item_catalog(name, unit_of_measure)
        `)
        .eq('procurement_order_id', id);

      if (lineItemsError) throw lineItemsError;

      return {
        order: order as ProcurementOrder,
        lineItems: lineItems as ProcurementLineItem[]
      };
    },
    enabled: !!id
  });
};

// Create procurement order
export const useCreateProcurementOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProcurementOrderDTO) => {
      // Get current user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // First create the PO
      const { data: order, error: orderError } = await supabase
        .from('procurement_orders')
        .insert({
          supplier_id: data.supplier_id,
          property_id: data.property_id,
          expected_delivery_date: data.expected_delivery_date,
          notes: data.notes,
          status: 'Draft', // Always starts as draft
          ordered_by_user_id: user.id, // Set the creator
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Then create line items
      const lineItems = data.line_items.map(item => ({
        procurement_order_id: order.id,
        ...item
      }));

      const { error: lineItemsError } = await supabase
        .from('procurement_line_items')
        .insert(lineItems);

      if (lineItemsError) throw lineItemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      toast.success('Procurement order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create procurement order: ' + error.message);
    }
  });
};

// Update procurement order
export const useUpdateProcurementOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { 
      id: string, 
      data: {
        supplier_id: string;
        property_id: string;
        expected_delivery_date: string;
        notes?: string;
        line_items: Array<{
          id?: string;
          item_id: string;
          quantity_ordered: number;
          unit_price?: number;
          currency?: string;
        }>;
      }
    }) => {
      // Get existing line items
      const { data: existingItems, error: fetchError } = await supabase
        .from('procurement_line_items')
        .select('id')
        .eq('procurement_order_id', id);

      if (fetchError) throw fetchError;

      // Create a set of existing IDs
      const existingIds = new Set(existingItems.map(item => item.id));
      // Create a set of new IDs from the form data
      const newIds = new Set(data.line_items.filter(item => item.id).map(item => item.id));

      // Find items to delete (exist in DB but not in new data)
      const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

      // Update the main order first
      const { error: orderError } = await supabase
        .from('procurement_orders')
        .update({
          supplier_id: data.supplier_id,
          property_id: data.property_id,
          expected_delivery_date: data.expected_delivery_date,
          notes: data.notes,
        })
        .eq('id', id);

      if (orderError) throw orderError;

      // Delete removed items
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('procurement_line_items')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Update or insert line items
      for (const item of data.line_items) {
        if (item.id) {
          // Update existing item
          const { error: updateError } = await supabase
            .from('procurement_line_items')
            .update({
              item_id: item.item_id,
              quantity_ordered: item.quantity_ordered,
              unit_price: item.unit_price,
              currency: item.currency,
            })
            .eq('id', item.id);

          if (updateError) throw updateError;
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from('procurement_line_items')
            .insert({
              procurement_order_id: id,
              item_id: item.item_id,
              quantity_ordered: item.quantity_ordered,
              unit_price: item.unit_price,
              currency: item.currency,
            });

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables.id] });
      toast.success('Procurement order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update procurement order: ' + error.message);
    }
  });
};

// Update line item
export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLineItemDTO }) => {
      const { data: lineItem, error } = await supabase
        .from('procurement_line_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return lineItem;
    },
    onSuccess: async (_, variables) => {
      // We need to invalidate the specific PO query to refresh line items
      const { data: lineItem, error } = await supabase
        .from('procurement_line_items')
        .select('procurement_order_id')
        .eq('id', variables.id)
        .single();

      if (error) {
        console.error('Error fetching line item:', error);
        return;
      }

      if (lineItem) {
        queryClient.invalidateQueries({ queryKey: ['procurement-orders', lineItem.procurement_order_id] });
      }
      toast.success('Line item updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update line item: ' + error.message);
    }
  });
};

// Send for approval
export const useSendForApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if the user has permission
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Get the current order to verify it's still in Draft status
      const { data: currentOrder, error: fetchError } = await supabase
        .from('procurement_orders')
        .select(`
          *,
          ordered_by_user_id
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (currentOrder.status !== 'Draft') {
        throw new Error('Order must be in Draft status to send for approval');
      }

      // Update the order status
      const { data: order, error } = await supabase
        .from('procurement_orders')
        .update({ status: 'Pending Approval' })
        .eq('id', id)
        .eq('status', 'Draft') // Extra safety check
        .select(`
          *,
          supplier:suppliers(name),
          property:properties(name),
          ordered_by:profiles!ordered_by_user_id(full_name),
          approved_by:profiles!approved_by_user_id(full_name)
        `)
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables] });
      toast.success('Procurement order sent for approval');
    },
    onError: (error) => {
      toast.error('Failed to send for approval: ' + error.message);
    }
  });
};

// Approve order
export const useApproveOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      const { data: order, error } = await supabase
        .from('procurement_orders')
        .update({ 
          status: 'Approved',
          approved_by_user_id: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'Pending Approval') // Extra safety check
        .select(`
          *,
          supplier:suppliers(name),
          property:properties(name),
          ordered_by:profiles!ordered_by_user_id(full_name),
          approved_by:profiles!approved_by_user_id(full_name)
        `)
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables] });
      toast.success('Procurement order approved');
    },
    onError: (error) => {
      toast.error('Failed to approve order: ' + error.message);
    }
  });
};

// Reject order
export const useRejectOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      const { data: order, error } = await supabase
        .from('procurement_orders')
        .update({ 
          status: 'Rejected',
          approved_by_user_id: user.id, // We store who rejected it in the same field
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'Pending Approval') // Extra safety check
        .select(`
          *,
          supplier:suppliers(name),
          property:properties(name),
          ordered_by:profiles!ordered_by_user_id(full_name),
          approved_by:profiles!approved_by_user_id(full_name)
        `)
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables] });
      toast.success('Procurement order rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject order: ' + error.message);
    }
  });
};

// Delete order
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get user to check permission implicitly via RLS
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('procurement_orders')
        .delete()
        .eq('id', id)
        .eq('status', 'Draft'); // RLS also enforces this, but belt-and-suspenders

      if (error) {
        // Check for RLS violation error (adjust code/message as needed)
        if (error.code === '42501') {
          throw new Error('Permission denied or order is not in Draft status.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      toast.success('Procurement order deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete procurement order: ' + error.message);
    }
  });
};

// New hook to update order status (generic)
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProcurementOrder['status'] }) => {
      // Get user to ensure authentication check occurs before RLS/trigger
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // The actual permission and status transition logic is handled by RLS policies
      // and the trigger function `validate_po_status_transition` in the database.
      const { data: updatedOrder, error } = await supabase
        .from('procurement_orders')
        .update({ status: status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Check for RLS violation or trigger errors
        if (error.code === '42501' || error.message.includes('PERMISSION DENIED') || error.message.includes('INVALID TRANSITION')) {
           // Extract the specific error message from the DB if possible
           const dbErrorMessage = error.message.split('ERROR:  ').pop() || 'Permission denied or invalid status transition.';
           throw new Error(dbErrorMessage);
        }
        throw error;
      }
      return updatedOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables.id] });
      toast.success(`Procurement order status updated to ${variables.status}`);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });
};

// Helper function (not exported) - Can be removed if not used elsewhere
const validateStatusTransition = (currentStatus: ProcurementOrder['status'], newStatus: ProcurementOrder['status']): boolean => {
  // This logic is primarily handled by the DB trigger now, but could be used for optimistic UI
  const allowedTransitions: Partial<Record<ProcurementOrder['status'], ProcurementOrder['status'][]>> = {
    'Draft': ['Pending Approval', 'Cancelled'],
    'Pending Approval': ['Approved', 'Rejected'],
    'Approved': ['Ordered', 'Cancelled'], // Can mark as Ordered or Cancel
    'Ordered': ['Partially Received', 'Received', 'Cancelled'], // Can receive or cancel
    'Partially Received': ['Received', 'Cancelled'], // Can fully receive or cancel
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}; 

// ... existing hook code ...

// New hook to handle receiving items for a PO
export const useReceiveProcurementOrderItems = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({
        orderId,
        receivedItems,
      }: {
        orderId: string;
        receivedItems: { lineItemId: string; quantityReceived: number }[];
      }) => {
        // 1. Check Auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
  
        // 2. Update line items quantity_received
        // We should ideally wrap this in a transaction if possible, but Supabase JS v2
        // doesn't directly support client-side transactions easily across multiple updates.
        // We'll perform updates sequentially and rely on error handling.
        // Consider a DB function/trigger for atomicity if this becomes critical.
        for (const item of receivedItems) {
           // Basic validation before sending to DB
           if (item.quantityReceived < 0) {
               throw new Error(`Received quantity for item ID ${item.lineItemId} cannot be negative.`);
           }
           // More validation (e.g., not exceeding quantity_ordered) might be needed
           // or enforced by DB constraints/triggers if possible.
  
          const { error: updateError } = await supabase
            .from('procurement_line_items')
            .update({ quantity_received: item.quantityReceived })
            .eq('id', item.lineItemId)
            .eq('procurement_order_id', orderId); // Ensure we only update items of this PO
  
          if (updateError) {
            console.error(`Error updating line item ${item.lineItemId}:`, updateError);
            throw new Error(`Failed to update received quantity for line item ${item.lineItemId}. ${updateError.message}`);
          }
        }
  
        // 3. Determine new PO status (check if fully received)
        // Refetch line items to compare ordered vs received quantities
        const { data: updatedLineItems, error: fetchError } = await supabase
          .from('procurement_line_items')
          .select('quantity_ordered, quantity_received')
          .eq('procurement_order_id', orderId);
  
        if (fetchError) {
            console.error(`Error fetching line items after update for PO ${orderId}:`, fetchError);
            throw new Error(`Failed to verify received quantities for PO ${orderId}. ${fetchError.message}`);
        }
  
        const isFullyReceived = updatedLineItems.every(
            line => line.quantity_received >= line.quantity_ordered
        );
        const isPartiallyReceived = updatedLineItems.some(line => line.quantity_received > 0) && !isFullyReceived;
  
        let newStatus: ProcurementOrder['status'] = 'Ordered'; // Default assumption
        if (isFullyReceived) {
          newStatus = 'Received';
        } else if (isPartiallyReceived) {
          newStatus = 'Partially Received';
        }
        // If neither fully nor partially received (all quantity_received are 0 or less),
        // technically the status might remain 'Ordered' unless explicitly cancelled.
        // For simplicity here, we transition if *any* item is received.
  
        // 4. Update PO Status (and potentially date_received)
        if (newStatus === 'Received' || newStatus === 'Partially Received') {
            const updatePayload: Partial<ProcurementOrder> = { status: newStatus };
            if (newStatus === 'Received') {
                updatePayload.date_received = new Date().toISOString();
            }
  
          const { error: statusUpdateError } = await supabase
            .from('procurement_orders')
            .update(updatePayload)
            .eq('id', orderId);
  
          if (statusUpdateError) {
              console.error(`Error updating PO ${orderId} status to ${newStatus}:`, statusUpdateError);
              // Note: Line items might be updated, but PO status failed.
              // This scenario requires careful consideration (e.g., manual fix, retry logic)
             throw new Error(`Failed to update PO status to ${newStatus}. ${statusUpdateError.message}`);
          }
        } else {
           // Handle cases where status doesn't change (e.g., receiving 0 items on an Ordered PO)
           // Maybe log a notice or do nothing.
           console.log(`PO ${orderId} status remains unchanged as no items appear to have been received effectively.`);
        }
  
        // Return something indicating success, maybe the final status
        return { finalStatus: newStatus };
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
        queryClient.invalidateQueries({ queryKey: ['procurement-orders', variables.orderId] });
        toast.success(`Successfully processed received items for PO. Final status: ${data.finalStatus}`);
      },
      onError: (error) => {
        toast.error(`Failed to receive items: ${error.message}`);
      }
    });
  };
  
  
  // Helper function (not exported) - Can be removed if not used elsewhere
  // ... (validateStatusTransition can remain or be removed) ...
  