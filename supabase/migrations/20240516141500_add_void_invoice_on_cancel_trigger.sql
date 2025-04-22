-- Phase 4.2.2: Update Invoice Status on Booking Cancellation/Refund (Corrected)

-- 1. Create Function to update invoice status (takes no arguments)
CREATE OR REPLACE FUNCTION public.update_invoice_on_booking_cancel()
RETURNS TRIGGER -- Changed return type to TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Needs permission to update invoices
AS $$
DECLARE
    v_invoice_id uuid;
    v_booking_id uuid := NEW.id; -- Get booking ID from NEW record
BEGIN
    -- Find the invoice associated with the booking
    SELECT id INTO v_invoice_id
    FROM public.invoices
    WHERE booking_id = v_booking_id
    LIMIT 1;

    -- If an invoice exists, update its status to 'Void'
    IF v_invoice_id IS NOT NULL THEN
        UPDATE public.invoices
        SET status = 'void',
            updated_at = now() -- Ensure updated_at trigger fires if needed
        WHERE id = v_invoice_id;
        
        RAISE LOG 'Updated invoice % status to void due to booking % cancellation/refund.', v_invoice_id, v_booking_id;
    ELSE
        RAISE LOG 'No invoice found for booking ID % to void.', v_booking_id;
    END IF;

    RETURN NEW; -- Required for AFTER triggers
END;
$$;

COMMENT ON FUNCTION public.update_invoice_on_booking_cancel() IS 'Updates the associated invoice status to void when a booking is cancelled or refunded. Trigger function.';

-- 2. Create Trigger on bookings table (calling function without arguments)
-- First, drop the potentially incorrect trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_invoice_on_booking_cancel ON public.bookings;
-- Now create the corrected trigger
CREATE TRIGGER trigger_update_invoice_on_booking_cancel
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (
    (OLD.booking_status IS DISTINCT FROM 'cancelled' AND NEW.booking_status = 'cancelled')
    OR 
    (OLD.payment_status IS DISTINCT FROM 'refunded' AND NEW.payment_status = 'refunded')
)
EXECUTE FUNCTION public.update_invoice_on_booking_cancel(); -- Corrected: No arguments passed here

COMMENT ON TRIGGER trigger_update_invoice_on_booking_cancel ON public.bookings IS 'Calls function to void associated invoice when booking status becomes cancelled or payment status becomes refunded.';

-- 3. Grant execute permission (matching argument-less function)
-- Drop potentially incorrect grant first (if function signature changed)
REVOKE EXECUTE ON FUNCTION public.update_invoice_on_booking_cancel(uuid) FROM authenticated; -- Assuming old signature
-- Grant for the new signature
GRANT EXECUTE ON FUNCTION public.update_invoice_on_booking_cancel() TO authenticated; 