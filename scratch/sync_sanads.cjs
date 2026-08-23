const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://memrzpxzijsthjeduago.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U7RXNJamliDNGJUcVSHCkw_ssX9_NyD';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function syncExistingSanads() {
  console.log('Fetching delegates...');
  const { data, error } = await supabase.from('delegates').select('*');
  if (error) {
    console.error('Error fetching delegates:', error);
    return;
  }

  for (const d of data) {
    const rawVal = (d.sanad && d.sanad !== 'N/A') ? d.sanad : ((d.birudam && d.birudam !== 'N/A') ? d.birudam : 'N/A');
    if ((d.sanad !== rawVal) || (d.birudam !== rawVal)) {
      console.log(`Syncing ${d.full_name} (${d.pass_id}): sanad/birudam -> "${rawVal}"`);
      const { error: updErr } = await supabase
        .from('delegates')
        .update({ sanad: rawVal, birudam: rawVal })
        .eq('id', d.id);
      if (updErr) {
        console.error(`Failed to update ${d.pass_id}:`, updErr.message);
      } else {
        console.log(`Updated ${d.pass_id} successfully.`);
      }
    }
  }

  console.log('All delegates synced!');
}

syncExistingSanads();
