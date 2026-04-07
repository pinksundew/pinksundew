const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function check() {
  const { data, error } = await supabase.rpc('get_policies');

  if (error) {
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'projects');

    console.log(policies ?? policyError);
    return;
  }

  console.log(data);
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});
