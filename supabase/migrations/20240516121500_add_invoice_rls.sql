-- Phase 4.1.4: RLS Policies for Invoices

-- Enable RLS on the tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- ** invoices RLS Policies **

-- 1. Allow SELECT if user has 'view_invoices' permission
CREATE POLICY "Allow view access based on permission" 
ON public.invoices
FOR SELECT
USING (public.user_has_permission(auth.uid(), 'view_invoices'));

-- 2. Allow INSERT if user has 'add_invoices' permission
CREATE POLICY "Allow insert access based on permission" 
ON public.invoices
FOR INSERT
WITH CHECK (public.user_has_permission(auth.uid(), 'add_invoices'));

-- 3. Allow UPDATE if user has 'edit_invoices' permission
CREATE POLICY "Allow update access based on permission" 
ON public.invoices
FOR UPDATE
USING (public.user_has_permission(auth.uid(), 'edit_invoices'))
WITH CHECK (public.user_has_permission(auth.uid(), 'edit_invoices'));

-- 4. Allow DELETE if user has 'edit_invoices' permission (or a specific delete permission if added later)
CREATE POLICY "Allow delete access based on permission" 
ON public.invoices
FOR DELETE
USING (public.user_has_permission(auth.uid(), 'edit_invoices'));

-- ** invoice_line_items RLS Policies **

-- 1. Allow SELECT if user can view the parent invoice
CREATE POLICY "Allow view access based on parent invoice permission" 
ON public.invoice_line_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.id = invoice_line_items.invoice_id
        -- The SELECT policy on invoices already checks view_invoices permission
    )
);

-- 2. Allow INSERT if user can edit the parent invoice
CREATE POLICY "Allow insert access based on parent invoice permission" 
ON public.invoice_line_items
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.id = invoice_line_items.invoice_id 
        AND public.user_has_permission(auth.uid(), 'edit_invoices')
    )
);

-- 3. Allow UPDATE if user can edit the parent invoice
CREATE POLICY "Allow update access based on parent invoice permission" 
ON public.invoice_line_items
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.id = invoice_line_items.invoice_id 
        AND public.user_has_permission(auth.uid(), 'edit_invoices')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.id = invoice_line_items.invoice_id 
        AND public.user_has_permission(auth.uid(), 'edit_invoices')
    )
);

-- 4. Allow DELETE if user can edit the parent invoice
CREATE POLICY "Allow delete access based on parent invoice permission" 
ON public.invoice_line_items
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.id = invoice_line_items.invoice_id 
        AND public.user_has_permission(auth.uid(), 'edit_invoices')
    )
); 