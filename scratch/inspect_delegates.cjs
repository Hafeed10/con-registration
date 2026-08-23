const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://memrzpxzijsthjeduago.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U7RXNJamliDNGJUcVSHCkw_ssX9_NyD';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  const { data, error } = await supabase.from('delegates').select('*');
  console.log('Error:', error);
  console.log('Delegates count:', data?.length);
  if (data && data.length > 0) {
    data.forEach(d => {
      console.log({
        id: d.id,
        pass_id: d.pass_id,
        full_name: d.full_name,
        sanad: d.sanad,
        birudam: d.birudam,
        study_range: d.study_range
      });
    });
  }
}

inspect();
