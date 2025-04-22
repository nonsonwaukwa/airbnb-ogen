-- Phase 4.1: Invoice Management Foundation

-- 4.1.1: `invoices` Table
CREATE TABLE public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number text UNIQUE NOT NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    customer_address_street text,
    customer_address_city text,
    customer_address_state text,
    customer_address_postal_code text,
    customer_address_country text,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    subtotal_amount numeric DEFAULT 0.00,
    tax_amount numeric DEFAULT 0.00,
    discount_amount numeric DEFAULT 0.00,
    total_amount numeric DEFAULT 0.00, -- This will be updated by a trigger
    amount_paid numeric DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'NGN', -- Default to NGN or configure as needed
    status text NOT NULL DEFAULT 'Draft', -- e.g., Draft, Sent, Paid, Partially Paid, Void
    notes text,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    payment_method text,
    payment_date date,
    created_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT invoices_status_check CHECK (status IN ('Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Void'))
);

COMMENT ON TABLE public.invoices IS 'Stores customer invoices.';
COMMENT ON COLUMN public.invoices.total_amount IS 'Calculated sum of line items minus discounts plus tax. Updated by trigger.';

-- Add index for faster lookup by status and booking_id
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_booking_id ON public.invoices(booking_id);

-- 4.1.2: `invoice_line_items` Table
CREATE TABLE public.invoice_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL DEFAULT 0.00,
    line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_line_items IS 'Stores individual line items for an invoice.';
COMMENT ON COLUMN public.invoice_line_items.line_total IS 'Calculated automatically: quantity * unit_price.';

-- Add index for faster lookup by invoice_id
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- 4.1.3: DB Function & Trigger to update invoice totals

-- Function to recalculate invoice totals
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id uuid;
    v_subtotal numeric;
    v_total numeric;
BEGIN
    -- Determine the invoice_id based on INSERT, UPDATE, or DELETE
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Calculate the sum of line totals for the specific invoice
    SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
    FROM public.invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Calculate the final total (consider discounts and taxes from the invoice table itself)
    -- Note: This assumes discount_amount and tax_amount are manually set/updated on the invoice record directly.
    -- If tax/discount should be calculated from line items, this logic needs adjustment.
    SELECT v_subtotal - COALESCE(discount_amount, 0) + COALESCE(tax_amount, 0) INTO v_total
    FROM public.invoices
    WHERE id = v_invoice_id;

    -- Update the subtotal and total amount on the parent invoice
    UPDATE public.invoices
    SET 
        subtotal_amount = v_subtotal,
        total_amount = v_total,
        updated_at = now()
    WHERE id = v_invoice_id;

    -- For DELETE operation, return OLD; otherwise return NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Trigger to call the function after changes to invoice_line_items
CREATE TRIGGER trigger_update_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_totals();

COMMENT ON TRIGGER trigger_update_invoice_totals ON public.invoice_line_items IS 'Updates the total_amount on the parent invoice after line item changes.';

-- Grant execute permission on the function to the authenticated role
-- Adjust role if necessary based on your Supabase setup
GRANT EXECUTE ON FUNCTION public.update_invoice_totals() TO authenticated;


-- Note: RLS policies (4.1.4) are not included here and will be added in Phase 4.2/4.3. 