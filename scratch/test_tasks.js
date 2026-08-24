const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://faoetyzqzqqtwatflefk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2NTExNiwiZXhwIjoyMDk5MTQxMTE2fQ.f3TJWUqP1HNNjvd_-xG51LawC6UVC1poiHMjgaiL-QQ'
);

async function test() {
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  console.log('Select * from tasks:', { data, error });
}
test();
