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
  let r = await exec(`ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY`);
  console.log('1. RLS:', r?.error || 'OK');

  r = await exec(`CREATE POLICY "Fixed expenses admin" ON fixed_expenses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())`);
  console.log('2. Policy:', r?.error || 'OK');

  // Insert default rent if not exists
  r = await exec(`INSERT INTO fixed_expenses (description, amount, category) SELECT 'Aluguel', 0, 'Aluguel' WHERE NOT EXISTS (SELECT 1 FROM fixed_expenses WHERE category = 'Aluguel')`);
  console.log('3. Default rent:', r?.error || 'OK');
}

setup();
