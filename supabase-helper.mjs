import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dbukdhycfaibdshxnatt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ddbs0VP1QEHdVyk5XeTQeg_1KuQz5kR';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sql = async (query) => {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) throw new Error(error.message);
  return data;
};

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case 'tables': {
      const tables = ['clients', 'services', 'bookings', 'professionals', 'secrets', 'reviews', 'admin_users'];
      console.log('Tables in Black Diamond:');
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        console.log(`  - ${t}: ${count} rows`);
      }
      break;
    }

    case 'query': {
      const sqlQuery = args.join(' ');
      if (!sqlQuery) { console.log('Usage: node supabase-helper.mjs query "SELECT ..."'); break; }
      const result = await sql(sqlQuery);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'exec': {
      const sqlExec = args.join(' ');
      if (!sqlExec) { console.log('Usage: node supabase-helper.mjs exec "ALTER TABLE ..."'); break; }
      const result = await sql(sqlExec);
      console.log('OK:', JSON.stringify(result));
      break;
    }

    case 'count': {
      const table = args[0] || 'clients';
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) console.error('Error:', error.message);
      else console.log(`Total rows in ${table}: ${count}`);
      break;
    }

    case 'list': {
      const table = args[0] || 'clients';
      const limit = parseInt(args[1]) || 10;
      const { data, error } = await supabase.from(table).select('*').limit(limit);
      if (error) console.error('Error:', error.message);
      else console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'find': {
      const table = args[0] || 'clients';
      const column = args[1] || 'name';
      const value = args.slice(2).join(' ');
      if (!value) { console.log('Usage: node supabase-helper.mjs find clients name "João"'); break; }
      const { data, error } = await supabase.from(table).select('*').ilike(column, `%${value}%`);
      if (error) console.error('Error:', error.message);
      else console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'rls': {
      const table = args[0];
      if (!table) { console.log('Usage: node supabase-helper.mjs rls <table>'); break; }
      await sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`RLS habilitado em ${table}`);
      break;
    }

    case 'policy': {
      const table = args[0]; const name = args[1]; const def = args.slice(2).join(' ');
      if (!table || !name || !def) { console.log('Usage: node supabase-helper.mjs policy <table> <name> <definition>'); break; }
      await sql(`DROP POLICY IF EXISTS "${name}" ON ${table}`);
      await sql(`CREATE POLICY "${name}" ON ${table} ${def}`);
      console.log(`Policy "${name}" criada em ${table}`);
      break;
    }

    default:
      console.log(`
Supabase Helper - Black Diamond
================================
  tables                 List tables + row counts
  query "SQL"            Run SELECT query
  exec "SQL"             Run any SQL (DDL/DML)
  count [table]          Count rows
  list [table] [limit]   List rows
  find [table] [col] [val]  Search by column
  rls <table>            Enable RLS
  policy <table> <name>  Create RLS policy
      `);
  }
}

main().catch(console.error);
