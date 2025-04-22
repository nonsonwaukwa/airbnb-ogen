-- Phase 4.2.1: Refine/Implement trigger to create invoice when booking is paid

-- 1. Drop existing trigger and function (if they exist) to ensure clean implementation
DROP TRIGGER IF EXISTS trigger_create_invoice_on_paid ON public.bookings;
DROP FUNCTION IF EXISTS public.create_invoice_from_booking(uuid);
-- Also drop the old trigger function if it had a different name (based on 3.1.2)
-- DROP FUNCTION IF EXISTS public.create_invoice_from_booking(); -- Removed this line as the function signature was likely different or non-existent

-- 2. Create the function to generate invoice details from a booking
CREATE OR REPLACE FUNCTION public.create_invoice_from_booking(p_booking_id uuid)
RETURNS void -- Returns nothing, performs inserts
LANGUAGE plpgsql
SECURITY DEFINER -- Needs permissions to insert into invoices/line_items
AS $$
DECLARE
    v_booking record;
    v_invoice_id uuid;
    v_invoice_number text;
BEGIN
    -- Fetch booking details
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    -- Exit if booking not found
    IF NOT FOUND THEN
        RAISE WARNING 'Booking not found for ID: %', p_booking_id;
        RETURN;
    END IF;

    -- Check if an invoice already exists for this booking to prevent duplicates
    PERFORM 1 FROM public.invoices WHERE booking_id = p_booking_id;
    IF FOUND THEN
        RAISE WARNING 'Invoice already exists for booking ID: %', p_booking_id;
        RETURN; 
    END IF;

    -- Generate a unique invoice number (example format)
    v_invoice_number := 'INV-BK-' || v_booking.booking_number;
    -- Add collision check/handling if needed, e.g., append timestamp or sequence
    -- PERFORM 1 FROM public.invoices WHERE invoice_number = v_invoice_number;
    -- IF FOUND THEN ... handle collision ... END IF;

    -- Insert into invoices table
    INSERT INTO public.invoices (
        invoice_number,
        customer_name,
        customer_email,
        customer_phone,
        issue_date,
        due_date, -- Set due date based on policy, e.g., issue_date + 14 days
        currency,
        status, -- Set initial status, e.g., 'Sent' or 'Paid' since trigger is on payment
        booking_id,
        created_by_user_id -- Can be null or set to the user who triggered the payment update if available
    )
    VALUES (
        v_invoice_number,
        v_booking.guest_name,
        v_booking.guest_email,
        v_booking.guest_phone,
        CURRENT_DATE,
        CURRENT_DATE + interval '14 days', -- Example: Due in 14 days
        COALESCE(v_booking.currency, 'NGN'), -- Use booking currency or default
        'Sent', -- Setting status to 'Sent' initially
        p_booking_id,
        auth.uid() -- Assign the user who updated the booking as creator (assuming trigger runs in user context)
    )
    RETURNING id INTO v_invoice_id; -- Get the new invoice ID

    -- Insert into invoice_line_items
    IF v_invoice_id IS NOT NULL AND v_booking.amount IS NOT NULL AND v_booking.amount > 0 THEN
        INSERT INTO public.invoice_line_items (
            invoice_id,
            description,
            quantity,
            unit_price
        )
        VALUES (
            v_invoice_id,
            'Booking: ' || COALESCE(v_booking.property->>'name', v_booking.booking_number), -- Example description
            1,
            v_booking.amount
        );
        -- Note: The trigger on invoice_line_items will update invoice totals
    ELSE
         RAISE WARNING 'Invoice created for booking ID: %, but line item not added (amount was null or zero). Invoice ID: %', p_booking_id, v_invoice_id;
    END IF;

END;
$$;

COMMENT ON FUNCTION public.create_invoice_from_booking(uuid) IS 'Creates an invoice and line item based on a given booking ID. Triggered when booking payment_status becomes paid.';

-- 3. Create the trigger on the bookings table
CREATE TRIGGER trigger_create_invoice_on_paid
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid')
EXECUTE FUNCTION public.create_invoice_from_booking(id);

COMMENT ON TRIGGER trigger_create_invoice_on_paid ON public.bookings IS 'Automatically creates an invoice when a booking payment status changes to paid.';

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_invoice_from_booking(uuid) TO authenticated; 