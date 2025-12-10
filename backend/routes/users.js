const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('./auth');

const router = express.Router();

// Accept Terms & Conditions
router.post('/accept-terms', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ accepted_terms_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, profile: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Current User Profile
router.get('/me', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        // If no profile found, return basic user info from auth if possible, or 404/null
        if (!data) {
            return res.json({ id: userId, email: req.user.email, full_name: req.user.user_metadata?.full_name || '' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deactivate/Delete Account
router.delete('/delete-account', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        // Delete user from Supabase Auth (admin privilege required)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account. Please try again.' });
    }
});

module.exports = router;
