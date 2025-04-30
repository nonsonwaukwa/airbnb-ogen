-- #############################################################
-- # Phase 6: Procurement Management RLS & Trigger Logic       #
-- #############################################################

-- Note: Ensure the helper function public.user_has_permission(UUID, TEXT) exists from Phase 1.

-- == RLS Policies (Simplified - Validation Logic Moved to Triggers) ==

-- Enable RLS on tables (Run only if not already enabled)
-- ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.procurement_line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean application
DROP POLICY IF EXISTS "View procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Create procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Update draft procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Update draft orders" ON public.procurement_orders; -- Duplicate name
DROP POLICY IF EXISTS "Send procurement orders for approval" ON public.procurement_orders;
DROP POLICY IF EXISTS "Approve or reject procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Update approved orders" ON public.procurement_orders; -- Duplicate name
DROP POLICY IF EXISTS "Update approved procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Delete draft procurement orders" ON public.procurement_orders;
DROP POLICY IF EXISTS "Delete procurement orders" ON public.procurement_orders; -- Duplicate name

-- Drop line item policies
DROP POLICY IF EXISTS "View procurement line items" ON public.procurement_line_items;
DROP POLICY IF EXISTS "Insert procurement line items" ON public.procurement_line_items;
DROP POLICY IF EXISTS "Update procurement line items" ON public.procurement_line_items;
DROP POLICY IF EXISTS "Delete procurement line items" ON public.procurement_line_items;
DROP POLICY IF EXISTS "Manage procurement line items" ON public.procurement_line_items; -- Drop old combined policy if exists


-- == PROCUREMENT ORDERS RLS POLICIES ==

-- Policy: Allow viewing based on 'view_procurement' permission
CREATE POLICY "View procurement orders"
    ON public.procurement_orders
    FOR SELECT
    TO authenticated
    USING (public.user_has_permission(auth.uid(), 'view_procurement'));

-- Policy: Allow insertion based on 'add_procurement' permission
CREATE POLICY "Create procurement orders"
    ON public.procurement_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_has_permission(auth.uid(), 'add_procurement'));

-- Policy: Allow targeting 'Draft' orders for update if user has 'add_procurement' (or 'edit_procurement' per original plan)
-- Note: Using 'add_procurement' based on user's last script version. Consider changing back to 'edit_procurement' if needed.
CREATE POLICY "Update draft procurement orders"
    ON public.procurement_orders
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_permission(auth.uid(), 'add_procurement') -- Or 'edit_procurement'
        AND status = 'Draft'
    ); -- No WITH CHECK here, validation moved to trigger

-- Policy: Allow targeting 'Draft' orders for update (specifically sending for approval) if user has 'add_procurement' or 'edit_procurement'
CREATE POLICY "Send procurement orders for approval"
    ON public.procurement_orders
    FOR UPDATE
    TO authenticated
    USING (
        -- Using OR based on trigger logic, adjust if needed
        public.user_has_permission(auth.uid(), 'add_procurement')
        AND status = 'Draft'
    ); -- No WITH CHECK here, validation moved to trigger

-- Policy: Allow targeting 'Pending Approval' orders for update if user has 'approve_procurement'
CREATE POLICY "Approve or reject procurement orders"
    ON public.procurement_orders
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_permission(auth.uid(), 'approve_procurement')
        AND status = 'Pending Approval'
    ); -- No WITH CHECK here, validation moved to trigger

-- Policy: Allow targeting 'Approved' orders for update if user has 'edit_procurement'
CREATE POLICY "Update approved procurement orders"
    ON public.procurement_orders
    FOR UPDATE
    TO authenticated
    USING (
        public.user_has_permission(auth.uid(), 'edit_procurement')
        AND status = 'Approved'
    ); -- No WITH CHECK here, validation moved to trigger

-- Policy: Allow deleting 'Draft' orders if user has 'delete_procurement'
CREATE POLICY "Delete draft procurement orders"
    ON public.procurement_orders
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_permission(auth.uid(), 'delete_procurement')
        AND status = 'Draft'
    );

-- == PROCUREMENT LINE ITEMS RLS POLICIES ==

-- Policy: Allow viewing line items if user can view the parent PO
CREATE POLICY "View procurement line items"
    ON public.procurement_line_items
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.procurement_orders po
        WHERE po.id = procurement_line_items.procurement_order_id
          AND public.user_has_permission(auth.uid(), 'view_procurement')
    ));

-- Policy: Allow inserting line items (Validation moved to trigger)
CREATE POLICY "Insert procurement line items"
    ON public.procurement_line_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Basic check, real validation is in the BEFORE INSERT trigger

-- Policy: Allow updating line items ONLY if parent PO is 'Draft' and user has add perm
-- Note: Consider changing 'add_procurement' to '(add_procurement OR edit_procurement)' if editors should also edit lines in drafts
CREATE POLICY "Update procurement line items"
    ON public.procurement_line_items
    FOR UPDATE
    TO authenticated
    USING ( -- Check the current parent PO status and user permission
        EXISTS (
            SELECT 1
            FROM public.procurement_orders po
            WHERE po.id = procurement_line_items.procurement_order_id
              AND po.status = 'Draft'
              AND public.user_has_permission(auth.uid(), 'add_procurement') -- Permission check on user
        )
    ); -- Removed WITH CHECK clause, validation handled by trigger if procurement_order_id changes


-- Policy: Allow deleting line items ONLY if parent PO is 'Draft' and user has add perm
-- Note: Consider changing 'add_procurement' to '(add_procurement OR edit_procurement)' if editors should also delete lines from drafts
CREATE POLICY "Delete procurement line items"
    ON public.procurement_line_items
    FOR DELETE
    TO authenticated
    USING ( -- Check the current parent PO status and user permission
        EXISTS (
            SELECT 1
            FROM public.procurement_orders po
            WHERE po.id = procurement_line_items.procurement_order_id
              AND po.status = 'Draft'
              AND public.user_has_permission(auth.uid(), 'add_procurement') -- Permission check on user
        )
    );


-- == Trigger Function and Trigger for PO Status Transition Validation ==

-- Drop trigger if it exists first
DROP TRIGGER IF EXISTS trigger_validate_po_status ON public.procurement_orders;
-- Drop function if it exists
DROP FUNCTION IF EXISTS public.validate_po_status_transition();

-- Create the function to validate status changes
CREATE OR REPLACE FUNCTION public.validate_po_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_is_status_change BOOLEAN := NEW.status IS DISTINCT FROM OLD.status;
    v_user_id UUID := auth.uid();
BEGIN
    IF NOT v_is_status_change THEN RETURN NEW; END IF; -- Only validate if status is actually changing

    -- Check transitions FROM 'Draft'
    IF OLD.status = 'Draft' THEN
        IF NEW.status = 'Pending Approval' THEN
            IF NOT (public.user_has_permission(v_user_id, 'add_procurement') OR public.user_has_permission(v_user_id, 'edit_procurement')) THEN
                 RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to send PO for approval.'; END IF;
            RETURN NEW;
        ELSE RAISE EXCEPTION 'INVALID TRANSITION: Cannot change status from Draft to %. Must be Pending Approval.', NEW.status; END IF;
    END IF;

    -- Check transitions FROM 'Pending Approval'
    IF OLD.status = 'Pending Approval' THEN
        IF NEW.status IN ('Approved', 'Rejected') THEN
            IF NOT public.user_has_permission(v_user_id, 'approve_procurement') THEN
                 RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to approve or reject PO.'; END IF;
            NEW.approved_by_user_id := v_user_id;
            RETURN NEW;
        ELSE RAISE EXCEPTION 'INVALID TRANSITION: Cannot change status from Pending Approval to %. Must be Approved or Rejected.', NEW.status; END IF;
    END IF;

    -- Check transitions FROM 'Approved'
    IF OLD.status = 'Approved' THEN
        IF NEW.status IN ('Ordered', 'Partially Received', 'Received', 'Cancelled') THEN
             IF NOT public.user_has_permission(v_user_id, 'edit_procurement') THEN
                 RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to update status of Approved PO.'; END IF;
             RETURN NEW;
        ELSE RAISE EXCEPTION 'INVALID TRANSITION: Cannot change status from Approved to %. Must be Ordered, Partially Received, Received, or Cancelled.', NEW.status; END IF;
    END IF;

    -- Check transitions FROM 'Ordered'
    IF OLD.status = 'Ordered' THEN
       IF NEW.status IN ('Partially Received', 'Received', 'Cancelled') THEN
           IF NOT public.user_has_permission(v_user_id, 'edit_procurement') THEN
               RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to update status of Ordered PO.'; END IF;
           RETURN NEW;
       ELSE RAISE EXCEPTION 'INVALID TRANSITION: Cannot change status from Ordered to %. Must be Partially Received, Received, or Cancelled.', NEW.status; END IF;
    END IF;

    -- Check transitions FROM 'Partially Received'
     IF OLD.status = 'Partially Received' THEN
       IF NEW.status IN ('Received', 'Cancelled') THEN
           IF NOT public.user_has_permission(v_user_id, 'edit_procurement') THEN
               RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to update status of Partially Received PO.'; END IF;
           RETURN NEW;
       ELSE RAISE EXCEPTION 'INVALID TRANSITION: Cannot change status from Partially Received to %. Must be Received or Cancelled.', NEW.status; END IF;
    END IF;

    -- Default: If status didn't change or a valid transition was handled, allow the update.
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger validate_po_status_transition: %', SQLERRM; RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.validate_po_status_transition() TO authenticated;

-- BEFORE UPDATE Trigger on the table to enforce status transitions
CREATE TRIGGER trigger_validate_po_status
    BEFORE UPDATE OF status ON public.procurement_orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.validate_po_status_transition();


-- == Trigger Function and Trigger for Line Item INSERT Validation ==

-- ** CORRECTED ORDER: Drop TRIGGER before FUNCTION **
-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_line_item_insert ON public.procurement_line_items;
-- Drop function if it exists
DROP FUNCTION IF EXISTS public.validate_line_item_insert();

-- Create the function to validate line item inserts
CREATE OR REPLACE FUNCTION public.validate_line_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_status TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    -- Get the status of the parent PO
    SELECT status INTO v_parent_status
    FROM public.procurement_orders
    WHERE id = NEW.procurement_order_id;

    -- Check if parent PO exists and is in 'Draft' status
    IF NOT FOUND OR v_parent_status <> 'Draft' THEN
        RAISE EXCEPTION 'INVALID OPERATION: Cannot add line item. Parent PO % does not exist or is not in Draft status.', NEW.procurement_order_id;
    END IF;

    -- Check if user has permission to add/edit procurement
    -- Note: Using 'add_procurement' based on user's last script version. Consider changing to (add_procurement OR edit_procurement) if needed.
    IF NOT public.user_has_permission(v_user_id, 'add_procurement') THEN
        RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to add line items to PO %.', NEW.procurement_order_id;
    END IF;

    -- If all checks pass, allow the insert
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger validate_line_item_insert: %', SQLERRM; RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.validate_line_item_insert() TO authenticated;

-- BEFORE INSERT Trigger on the line items table
-- Create the trigger (AFTER dropping the function)
CREATE TRIGGER trigger_validate_line_item_insert
    BEFORE INSERT ON public.procurement_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_line_item_insert();

-- == Trigger Function and Trigger for Line Item UPDATE Validation (Optional but Recommended) ==
-- This trigger prevents changing the procurement_order_id to a non-Draft PO

-- ** CORRECTED ORDER: Drop TRIGGER before FUNCTION **
-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_line_item_update ON public.procurement_line_items;
-- Drop function if it exists
DROP FUNCTION IF EXISTS public.validate_line_item_update();

-- Create the function to validate line item updates (specifically parent PO change)
CREATE OR REPLACE FUNCTION public.validate_line_item_update()
RETURNS TRIGGER AS $$
DECLARE
    v_target_parent_status TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    -- Only check if the procurement_order_id is actually changing
    IF NEW.procurement_order_id IS DISTINCT FROM OLD.procurement_order_id THEN

        -- Get the status of the NEW parent PO
        SELECT status INTO v_target_parent_status
        FROM public.procurement_orders
        WHERE id = NEW.procurement_order_id;

        -- Check if the NEW parent PO exists and is in 'Draft' status
        IF NOT FOUND OR v_target_parent_status <> 'Draft' THEN
            RAISE EXCEPTION 'INVALID OPERATION: Cannot move line item. Target PO % does not exist or is not in Draft status.', NEW.procurement_order_id;
        END IF;

        -- Check if user has permission to add/edit procurement for the NEW parent PO
        -- Note: Using 'add_procurement' based on user's last script version. Consider changing to (add_procurement OR edit_procurement) if needed.
        IF NOT public.user_has_permission(v_user_id, 'add_procurement') THEN
             RAISE EXCEPTION 'PERMISSION DENIED: User lacks permission to move line items to PO %.', NEW.procurement_order_id;
        END IF;
    END IF;

    -- If checks pass (or if parent ID didn't change), allow the update
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger validate_line_item_update: %', SQLERRM; RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.validate_line_item_update() TO authenticated;

-- BEFORE UPDATE Trigger on the line items table
-- Create the trigger (AFTER dropping the function)
CREATE TRIGGER trigger_validate_line_item_update
    BEFORE UPDATE ON public.procurement_line_items
    FOR EACH ROW
    -- Optimization: Only run if procurement_order_id is potentially changing
    WHEN (OLD.procurement_order_id IS DISTINCT FROM NEW.procurement_order_id)
    EXECUTE FUNCTION public.validate_line_item_update();


