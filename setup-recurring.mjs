import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dbukdhycfaibdshxnatt.supabase.co',
  'sb_publishable_Ddbs0VP1QEHdVyk5XeTQeg_1KuQz5kR'
);

const exec = async (q) => {
  const { data, error } = await supabase.rpc('exec_sql', { query: q });
  return error ? { error: error.message } : data;
};

async function setup() {
  // RLS policy
  let r = await exec(`CREATE POLICY "Recurring expenses admin" ON recurring_expenses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())`);
  console.log('1. Policy:', r?.error || 'OK');

  // RPC function to auto-create recurring expenses for a month
  r = await exec(`CREATE OR REPLACE FUNCTION auto_create_recurring_expenses(p_year integer, p_month integer)
RETURNS jsonb AS $$
DECLARE
  v_created jsonb := '[]'::jsonb;
  v_rec RECORD;
  v_date date;
  v_exists boolean;
BEGIN
  FOR v_rec IN SELECT * FROM recurring_expenses WHERE active = TRUE LOOP
    v_date := make_date(p_year, p_month, LEAST(v_rec.day_of_month, (DATE_TRUNC('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day')::date - DATE_TRUNC('month', make_date(p_year, p_month, 1))::date + 1));
    
    SELECT EXISTS(SELECT 1 FROM expenses WHERE description = v_rec.description AND expense_date = v_date) INTO v_exists;
    
    IF NOT v_exists THEN
      INSERT INTO expenses (description, amount, expense_date, category)
      VALUES (v_rec.description, v_rec.amount, v_date, v_rec.category);
      v_created := v_created || jsonb_build_object('description', v_rec.description, 'amount', v_rec.amount, 'date', v_date);
    END IF;
  END LOOP;
  RETURN v_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`);
  console.log('2. Function:', r?.error || 'OK');

  // RPC function to get recurring expenses
  r = await exec(`CREATE OR REPLACE FUNCTION get_recurring_expenses()
RETURNS SETOF recurring_expenses AS $$
BEGIN
  RETURN QUERY SELECT * FROM recurring_expenses WHERE active = TRUE ORDER BY day_of_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`);
  console.log('3. Get function:', r?.error || 'OK');
}

setup();
