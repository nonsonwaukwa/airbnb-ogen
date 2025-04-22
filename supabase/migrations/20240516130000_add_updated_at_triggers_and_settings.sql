-- Phase 4.1.5, 4.1.6, 4.1.7: Updated_at Triggers & System Settings

-- 4.1.5: Define & Apply `updated_at` triggers for `invoices` and `invoice_line_items`

-- Reusable function to set updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply trigger to invoices table
CREATE TRIGGER set_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

COMMENT ON TRIGGER set_invoices_updated_at ON public.invoices IS 'Trigger to set updated_at timestamp on invoice update';

-- Apply trigger to invoice_line_items table
CREATE TRIGGER set_invoice_line_items_updated_at
BEFORE UPDATE ON public.invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

COMMENT ON TRIGGER set_invoice_line_items_updated_at ON public.invoice_line_items IS 'Trigger to set updated_at timestamp on invoice line item update';

-- Grant execute permission (if not already granted globally or inherited)
-- GRANT EXECUTE ON FUNCTION public.trigger_set_updated_at() TO authenticated;

-- 4.1.6: `system_settings` Table
CREATE TABLE public.system_settings (
    id int PRIMARY KEY CHECK (id = 1), -- Ensures only one row can exist with id=1
    company_name text,
    company_address text,
    company_logo_url text,
    invoice_bank_details text, -- Could be JSONB for more structure
    updated_at timestamptz DEFAULT now(),
    updated_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.system_settings IS 'Stores global system settings like company info and invoice details. Only one row allowed (id=1).';

-- Apply updated_at trigger to system_settings as well
CREATE TRIGGER set_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

COMMENT ON TRIGGER set_system_settings_updated_at ON public.system_settings IS 'Trigger to set updated_at timestamp on system settings update';

-- Insert the single settings row (optional, can be done via UI/manually later)
-- Ensure the ID is 1 as per the constraint
-- INSERT INTO public.system_settings (id, company_name) VALUES (1, 'Your Company Name');


-- 4.1.7: RLS for `system_settings`

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow SELECT if user has 'manage_system_settings' permission
CREATE POLICY "Allow select based on permission" 
ON public.system_settings
FOR SELECT
USING (public.user_has_permission(auth.uid(), 'manage_system_settings'));

-- Allow UPDATE if user has 'manage_system_settings' permission
CREATE POLICY "Allow update based on permission" 
ON public.system_settings
FOR UPDATE
USING (public.user_has_permission(auth.uid(), 'manage_system_settings'))
WITH CHECK (public.user_has_permission(auth.uid(), 'manage_system_settings'));

-- Note: INSERT/DELETE are typically not needed via RLS as there should only be one row, managed via UPDATE.
-- If initial insert needs protection, consider function security or temporarily disabling RLS. 