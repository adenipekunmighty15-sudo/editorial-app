const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // We will add this to .env shortly

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey || '');

module.exports = supabase;
