-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated; 

   CREATE TRIGGER set_updated_at_procurement_orders
       BEFORE UPDATE ON public.procurement_orders
       FOR EACH ROW
       EXECUTE FUNCTION set_updated_at();

   CREATE TRIGGER set_updated_at_procurement_line_items
       BEFORE UPDATE ON public.procurement_line_items
       FOR EACH ROW
       EXECUTE FUNCTION set_updated_at();