const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.get('/', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/env', (req, res) => {
    // SECURITY: Do NOT return actual values. Only presence/length.
    const vars = {
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `SET (Length: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length})` : 'MISSING',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV
    };

    // Check Supabase Client State (is it Proxy or Real?)
    const supabaseState = supabase.auth ? 'Real Client' : 'Proxy/Mock (Missing Keys)';

    res.json({
        env_check: vars,
        supabase_state: supabaseState
    });
});

module.exports = router;
