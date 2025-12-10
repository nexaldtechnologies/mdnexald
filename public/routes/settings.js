const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('./auth');

const router = express.Router();

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

module.exports = router;
