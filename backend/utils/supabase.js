const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[SUPABASE_DEBUG] Env Check:', {
    url: supabaseUrl ? 'Required (Found)' : 'MISSING',
    key: supabaseKey ? `Required (Found, length ${supabaseKey.length})` : 'MISSING'
});

if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE_ERROR] Missing Environment Variables!');
    console.error('SUPABASE_URL:', supabaseUrl ? '[SET]' : '[MISSING]');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '[SET]' : '[MISSING]');
}

// Create client handling potential missing keys to avoid hard crash on require
// Explicitly check to prevent "URL not found" error from throwing immediately
let supabase;

if (supabaseUrl && supabaseKey) {
    console.log('[SUPABASE_DEBUG] Initializing Real Client');
    console.log('[SUPABASE_DEBUG] URL:', supabaseUrl);
    console.log('[SUPABASE_DEBUG] Key Length:', supabaseKey.length);
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    // Return a recursive dummy object that logs errors when accessed
    // This prevents "Cannot read property of undefined" crashes (e.g. supabase.auth.admin)
    console.warn('[SUPABASE] Initializing RESILIENT DUMMY client due to missing env vars');

    const createRecursiveProxy = (path = 'supabase') => {
        return new Proxy(() => {}, {
            get: (target, prop) => {
                // If accessing a promise-like property (then/catch) to resolve, return self to keep chaining or resolve to error
                if (prop === 'then') {
                    return (resolve, reject) => resolve({ data: null, error: { message: `Missing Env Vars: ${path}` } });
                }
                return createRecursiveProxy(`${path}.${String(prop)}`);
            },
            apply: (target, thisArg, args) => {
                const msg = `[SUPABASE ERROR] Call to '${path}(...)' blocked. SUPABASE_SERVICE_ROLE_KEY is MISSING in Vercel Env.`;
                console.error(msg);
                // Return structure matching common Supabase returns
                return Promise.resolve({
                    data: null,
                    error: {
                        message: msg,
                        code: 'MISSING_ENV',
                        hint: 'Add SUPABASE_SERVICE_ROLE_KEY to Vercel Settings'
                    }
                });
            }
        });
    };

    supabase = createRecursiveProxy();
}

module.exports = supabase;
