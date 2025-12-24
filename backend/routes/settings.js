const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('./auth');

const router = express.Router();

console.log("[Settings Router] Module Loaded"); // Debug


// Update logo URL
router.post('/logo', requireAuth, async (req, res) => {
    const { logoUrl } = req.body;
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ logo_url: logoUrl })
            .eq('id', userId)
            .select();

        if (error) throw error;

        res.json({ success: true, profile: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get User Preferences
router.get('/preferences', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', req.user.id)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        res.json(data?.preferences || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User Preferences
router.put('/preferences', requireAuth, async (req, res) => {
    try {
        const updates = req.body; // Expects { language: '...', region: '...', ... }

        // First get existing prefs to merge
        const { data: existing } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', req.user.id)
            .limit(1)
            .maybeSingle();

        const newPrefs = { ...(existing?.preferences || {}), ...updates };

        const { data, error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs })
            .eq('id', req.user.id)
            .select();

        if (error) throw error;

        res.json({ success: true, preferences: newPrefs });
    } catch (error) {
        console.error("[SETTINGS_API] Error saving preferences:", error);
        // Extract specific PostgREST error details
        res.status(500).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
    }
});

module.exports = router;
