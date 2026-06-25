DROP FUNCTION IF EXISTS get_available_slots(date);

CREATE FUNCTION get_available_slots(p_date date)
RETURNS TABLE(slot_time text) AS $$
DECLARE
    v_opening time;
    v_closing time;
    v_current time;
    v_dow integer;
BEGIN
    v_dow := EXTRACT(DOW FROM p_date);

    IF v_dow = 6 THEN
        v_opening := '08:00'::time;
        v_closing := '18:00'::time;
    ELSE
        v_opening := '08:30'::time;
        v_closing := '19:00'::time;
    END IF;

    v_current := v_opening;
    WHILE v_current < v_closing LOOP
        IF NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.booking_date = p_date
            AND b.booking_time = v_current
            AND b.status != 'cancelled'
        ) THEN
            slot_time := v_current::text;
            RETURN NEXT;
        END IF;
        v_current := v_current + interval '1 hour';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
