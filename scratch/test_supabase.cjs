const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://memrzpxzijsthjeduago.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U7RXNJamliDNGJUcVSHCkw_ssX9_NyD';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing connection to Supabase...');
  try {
    const { data: delData, error: delError } = await supabase.from('delegates').select('*').limit(5);
    console.log('Delegates table query result:');
    console.log('Error:', delError);
    console.log('Data:', delData);

    const { data: sessData, error: sessError } = await supabase.from('sessions').select('*').limit(5);
    console.log('Sessions table query result:');
    console.log('Error:', sessError);
    console.log('Data:', sessData);
// ....
    const { data: trkData, error: trkError } = await supabase.from('tracks').select('*').limit(5);
    console.log('Tracks table query result:');
    console.log('Error:', trkError);
    console.log('Data:', trkData);
  } catch (err) {
    console.error('Catch error:', err);
  }
}

test();
