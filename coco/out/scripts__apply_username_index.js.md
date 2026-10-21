# scripts/apply_username_index.js
lines:23 exports:
---
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'auth' },
});

(async () => {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "CREATE UNIQUE INDEX IF NOT EXISTS username_unique_idx ON auth.users ((user_metadata->>'username'));"
  });
  if (error) {
    console.error('Error applying username index:', error);
    process.exit(1);
  }
  console.log('Username unique index applied successfully');
})();
