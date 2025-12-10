const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE_ERROR] Missing Environment Variables!');
    console.error('SUPABASE_URL:', supabaseUrl ? '[SET]' : '[MISSING]');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '[SET]' : '[MISSING]');
}

// Create client anyway (it throws if URL missing), but logging precedes it.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
