-- Add trigger to confirm booking status when payment status becomes 'paid'

-- Function to perform the update
CREATE OR REPLACE FUNCTION public.handle_confirm_booking_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Executes with the permissions of the definer, necessary to update table
AS $$
BEGIN
  -- Check if payment_status changed to 'paid' and booking_status was 'pending'
  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' AND NEW.booking_status = 'pending' THEN
    -- Update the booking_status to 'confirmed' for the same row
    UPDATE public.bookings
    SET booking_status = 'confirmed'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW; -- Return the updated row for AFTER trigger
END;
$$;

-- Trigger definition
CREATE TRIGGER trigger_confirm_booking_on_paid
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_confirm_booking_on_paid();

-- Grant execute permission on the function to the authenticated role
-- Adjust role if necessary based on your Supabase setup
GRANT EXECUTE ON FUNCTION public.handle_confirm_booking_on_paid() TO authenticated;

-- Optional: Add a comment describing the trigger
COMMENT ON TRIGGER trigger_confirm_booking_on_paid ON public.bookings IS 'Automatically sets booking_status to confirmed when payment_status becomes paid (if status was pending).'; 