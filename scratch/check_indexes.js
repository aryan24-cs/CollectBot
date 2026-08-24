const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://faoetyzqzqqtwatflefk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2NTExNiwiZXhwIjoyMDk5MTQxMTE2fQ.f3TJWUqP1HNNjvd_-xG51LawC6UVC1poiHMjgaiL-QQ'
);

async function checkIndexes() {
  const { data, error } = await client.rpc('get_indexes_info').catch(() => ({ data: null }));
  console.log('Indexes RPC:', { data, error });
}
checkIndexes();
