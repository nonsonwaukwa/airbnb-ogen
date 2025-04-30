-- Drop existing policies first
DROP POLICY IF EXISTS "Update non-draft procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Update line items on receive" ON public.procurement_line_items;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_create_stock_adjustments ON public.procurement_orders;
DROP FUNCTION IF EXISTS public.trigger_stock_on_po_receive();
DROP TRIGGER IF EXISTS trigger_check_low_stock_on_inventory_update ON public.inventory_items;
DROP FUNCTION IF EXISTS public.check_low_stock_and_create_po();
DROP FUNCTION IF EXISTS public.generate_pending_po(UUID, UUID);

-- Now create/recreate all objects
-- Trigger to create stock adjustments when PO is received
CREATE OR REPLACE FUNCTION public.trigger_stock_on_po_receive()
RETURNS TRIGGER AS $$
BEGIN
    -- Add debug logging
    RAISE NOTICE 'trigger_stock_on_po_receive called for PO %. Old status: %, New status: %', 
        NEW.id, OLD.status, NEW.status;

    -- Only proceed if status is changing to 'Received'
    IF NEW.status = 'Received' AND OLD.status != 'Received' THEN
        RAISE NOTICE 'Creating stock adjustments for PO %', NEW.id;
        -- Call function to create stock adjustments
        PERFORM public.create_stock_adjustment_from_po_lines(NEW.id);
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_stock_on_po_receive: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on procurement_orders
CREATE TRIGGER trigger_create_stock_adjustments
    AFTER UPDATE ON public.procurement_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_stock_on_po_receive();

-- Additional RLS policy for updating non-draft PO status
CREATE POLICY "Update non-draft procurement orders"
    ON public.procurement_orders
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.role_permissions rp ON p.role_id = rp.role_id
            WHERE p.id = auth.uid()
            AND rp.permission_id = 'edit_procurement'
        )
        AND status NOT IN ('Draft', 'Pending Approval')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.role_permissions rp ON p.role_id = rp.role_id
            WHERE p.id = auth.uid()
            AND rp.permission_id = 'edit_procurement'
        )
        AND status NOT IN ('Draft', 'Pending Approval')
        AND (
            CASE 
                WHEN status = 'Ordered' THEN true
                WHEN status = 'Partially Received' AND total_quantity_received > 0 THEN true
                WHEN status = 'Received' AND total_quantity_received = total_quantity_ordered THEN true
                ELSE false
            END
        )
    );

-- Policy for updating line items when PO is being received
CREATE POLICY "Update line items on receive"
    ON public.procurement_line_items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.procurement_orders po
            JOIN public.profiles p ON p.id = auth.uid()
            JOIN public.role_permissions rp ON p.role_id = rp.role_id
            WHERE po.id = procurement_order_id
            AND po.status IN ('Ordered', 'Partially Received')
            AND rp.permission_id = 'edit_procurement'
        )
    )
    WITH CHECK (
        quantity_received >= 0
        AND quantity_received <= quantity_ordered
        AND EXISTS (
            SELECT 1 
            FROM public.procurement_orders po
            JOIN public.profiles p ON p.id = auth.uid()
            JOIN public.role_permissions rp ON p.role_id = rp.role_id
            WHERE po.id = procurement_order_id
            AND po.status IN ('Ordered', 'Partially Received')
            AND rp.permission_id = 'edit_procurement'
        )
    );

-- Function to generate pending PO for low stock items
CREATE OR REPLACE FUNCTION public.generate_pending_po(
    p_item_id UUID,
    p_property_id UUID
)
RETURNS void AS $$
DECLARE
    v_reorder_quantity INT;
    v_po_id UUID;
BEGIN
    -- Add debug logging
    RAISE NOTICE 'generate_pending_po called for item % at property %', 
        p_item_id, p_property_id;

    -- Get the reorder quantity for this item
    SELECT reorder_quantity INTO v_reorder_quantity
    FROM public.item_catalog
    WHERE id = p_item_id;

    RAISE NOTICE 'Reorder quantity for item %: %', p_item_id, v_reorder_quantity;

    -- Create new procurement order in Draft status first
    WITH new_po AS (
        INSERT INTO public.procurement_orders (
            status,
            notes,
            property_id,
            ordered_by_user_id
        )
        VALUES (
            'Draft', -- Start as Draft
            'Auto-generated for low stock item',
            p_property_id,
            auth.uid()
        )
        RETURNING id
    )
    SELECT id INTO v_po_id FROM new_po;

    RAISE NOTICE 'Created new PO % for low stock item', v_po_id;

    -- Create line item for the PO
    INSERT INTO public.procurement_line_items (
        procurement_order_id,
        item_id,
        quantity_ordered,
        quantity_received,
        notes
    )
    VALUES (
        v_po_id,
        p_item_id,
        v_reorder_quantity,
        0,
        'Auto-generated due to low stock'
    );

    RAISE NOTICE 'Added line item to PO % for item %', v_po_id, p_item_id;

    -- Now update the PO status to Pending Approval
    UPDATE public.procurement_orders
    SET status = 'Pending Approval'
    WHERE id = v_po_id;

    RAISE NOTICE 'Updated PO % status to Pending Approval', v_po_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in generate_pending_po: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check low stock and create PO if needed
CREATE OR REPLACE FUNCTION public.check_low_stock_and_create_po()
RETURNS TRIGGER AS $$
DECLARE
    v_low_stock_threshold INT;
    v_pending_po_exists BOOLEAN;
    v_item_id UUID := NEW.item_catalog_id;
    v_property_id UUID := NEW.property_id;
    v_current_quantity INT := NEW.current_quantity;
    v_item_name TEXT;
    v_debug_info JSONB;
BEGIN
    -- Collect debug info
    SELECT 
        jsonb_build_object(
            'item_name', ic.name,
            'low_stock_threshold', ic.low_stock_threshold,
            'reorder_quantity', ic.reorder_quantity,
            'old_quantity', OLD.current_quantity,
            'new_quantity', NEW.current_quantity,
            'trigger_condition_met', OLD.current_quantity > NEW.current_quantity
        )
    INTO v_debug_info
    FROM public.item_catalog ic
    WHERE ic.id = v_item_id;

    -- Log all relevant information
    RAISE LOG 'Low stock check debug info: %', v_debug_info;

    -- Get the item name for logging
    SELECT name INTO v_item_name FROM public.item_catalog WHERE id = v_item_id;
    
    -- Get the low stock threshold for this item
    SELECT low_stock_threshold
    INTO v_low_stock_threshold
    FROM public.item_catalog
    WHERE id = v_item_id;

    -- Log the check conditions
    RAISE LOG 'Checking conditions for item %: threshold=%, current=%, below_threshold=%', 
        v_item_name, 
        v_low_stock_threshold, 
        v_current_quantity,
        (v_low_stock_threshold IS NOT NULL AND v_low_stock_threshold >= 0 AND v_current_quantity <= v_low_stock_threshold);

    -- Check if quantity is at or below threshold and threshold is defined (>= 0)
    IF v_low_stock_threshold IS NOT NULL AND 
       v_low_stock_threshold >= 0 AND 
       v_current_quantity <= v_low_stock_threshold THEN

        -- Check if a 'Pending Approval' PO already exists for this item and property
        SELECT EXISTS (
            SELECT 1
            FROM public.procurement_orders po
            JOIN public.procurement_line_items pli ON po.id = pli.procurement_order_id
            WHERE po.status = 'Pending Approval'
                AND po.property_id = v_property_id
                AND pli.item_id = v_item_id
        )
        INTO v_pending_po_exists;

        -- Log PO check result
        RAISE LOG 'Pending PO check for item %: exists=%', v_item_name, v_pending_po_exists;

        -- If no pending PO exists, generate one
        IF NOT v_pending_po_exists THEN
            RAISE LOG 'Attempting to create PO for item %', v_item_name;
            BEGIN
                PERFORM public.generate_pending_po(v_item_id, v_property_id);
                RAISE LOG 'Successfully created PO for item %', v_item_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE LOG 'Failed to create PO for item %: %', v_item_name, SQLERRM;
                RAISE;
            END;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in check_low_stock_and_create_po for item %: %', v_item_name, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check low stock only when quantity decreases
CREATE TRIGGER trigger_check_low_stock_on_inventory_update
    AFTER UPDATE ON public.inventory_items
    FOR EACH ROW
    WHEN (OLD.current_quantity > NEW.current_quantity)
    EXECUTE FUNCTION public.check_low_stock_and_create_po();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_stock_adjustment_from_po_lines(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_stock_on_po_receive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pending_po(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_low_stock_and_create_po() TO authenticated; 