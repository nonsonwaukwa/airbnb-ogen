-- Add quantity tracking columns to procurement_orders
ALTER TABLE public.procurement_orders
ADD COLUMN total_quantity_ordered INT GENERATED ALWAYS AS (
    (SELECT COALESCE(SUM(quantity_ordered), 0) 
     FROM public.procurement_line_items 
     WHERE procurement_order_id = procurement_orders.id)
) STORED,
ADD COLUMN total_quantity_received INT GENERATED ALWAYS AS (
    (SELECT COALESCE(SUM(quantity_received), 0) 
     FROM public.procurement_line_items 
     WHERE procurement_order_id = procurement_orders.id)
) STORED; 