const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Server-side client. It uses the service role key so the API can write to tables
// that Row Level Security locks away from the public anon key. Never expose this
// key to the browser.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL in environment variables');
}

module.exports = createClient(supabaseUrl, supabaseKey || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
