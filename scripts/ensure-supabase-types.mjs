import fs from 'node:fs';
import path from 'node:path';

const ctsPath = path.resolve('node_modules/@supabase/supabase-js/dist/index.d.cts');
const mtsPath = path.resolve('node_modules/@supabase/supabase-js/dist/index.d.mts');

if (fs.existsSync(ctsPath) && !fs.existsSync(mtsPath)) {
  fs.copyFileSync(ctsPath, mtsPath);
  console.log('✔ Created @supabase/supabase-js index.d.mts');
}
