-- Phase 4.2.1: CORRECTED - Implement trigger to create invoice when booking is paid

-- 1. Drop potentially incorrect trigger and function from previous attempt
DROP TRIGGER IF EXISTS trigger_create_invoice_on_paid ON public.bookings;
DROP FUNCTION IF EXISTS public.create_invoice_from_booking(uuid); -- Drop the version with uuid arg
DROP FUNCTION IF EXISTS public.create_invoice_from_booking();    -- Drop the version with no args (if exists from this script run)

-- 2. Create the function (accepting NO arguments)
CREATE OR REPLACE FUNCTION public.create_invoice_from_booking()
RETURNS TRIGGER -- Changed return type to TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking record;
    v_invoice_id uuid;
    v_invoice_number text;
    p_booking_id uuid := NEW.id; -- Get booking ID from NEW record
BEGIN
    -- Fetch booking details using NEW.id
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    -- Exit if booking somehow not found (should not happen in AFTER UPDATE)
    IF NOT FOUND THEN
        RAISE WARNING '[Trigger create_invoice_from_booking] Booking not found for ID: %', p_booking_id;
        RETURN NEW; -- Return NEW for AFTER trigger
    END IF;

    -- Check if an invoice already exists for this booking
    PERFORM 1 FROM public.invoices WHERE booking_id = p_booking_id;
    IF FOUND THEN
        RAISE WARNING '[Trigger create_invoice_from_booking] Invoice already exists for booking ID: %', p_booking_id;
        RETURN NEW; 
    END IF;

    -- Generate invoice number
    v_invoice_number := 'INV-BK-' || v_booking.booking_number;

    -- Insert into invoices table
    INSERT INTO public.invoices (
        invoice_number,
        customer_name,
        customer_email,
        customer_phone,
        issue_date,
        due_date,
        currency,
        status,
        booking_id,
        created_by_user_id
    )
    VALUES (
        v_invoice_number,
        v_booking.guest_name,
        v_booking.guest_email,
        v_booking.guest_phone,
        CURRENT_DATE,
        CURRENT_DATE + interval '14 days',
        COALESCE(v_booking.currency, 'NGN'),
        'Sent',
        p_booking_id,
        auth.uid()
    )
    RETURNING id INTO v_invoice_id;

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
            'Booking: ' || COALESCE(v_booking.property->>'name', v_booking.booking_number),
            1,
            v_booking.amount
        );
    ELSE
         RAISE WARNING '[Trigger create_invoice_from_booking] Invoice created for booking ID: %, but line item not added (amount was null or zero). Invoice ID: %', p_booking_id, v_invoice_id;
    END IF;
    
    RETURN NEW; -- Return NEW for AFTER trigger

END;
$$;

COMMENT ON FUNCTION public.create_invoice_from_booking() IS 'Trigger function: Creates an invoice and line item based on the updated booking row (NEW). Triggered when booking payment_status becomes paid.';

-- 3. Create the trigger on the bookings table (calling function with NO arguments)
CREATE TRIGGER trigger_create_invoice_on_paid
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid')
EXECUTE FUNCTION public.create_invoice_from_booking(); -- No arguments here

COMMENT ON TRIGGER trigger_create_invoice_on_paid ON public.bookings IS 'Automatically creates an invoice when a booking payment status changes to paid.';

-- 4. Grant execute permission (function with NO arguments)
GRANT EXECUTE ON FUNCTION public.create_invoice_from_booking() TO authenticated; 