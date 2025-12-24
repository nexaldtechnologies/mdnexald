const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

// POST /api/tools/waitlist
router.post('/waitlist', async (req, res) => {
    const { email, tool_name, user_id } = req.body;

    if (!email || !tool_name) {
        return res.status(400).json({ error: 'Email and Tool Name are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('tool_waitlist')
            .insert([{
                email,
                tool_name,
                user_id: user_id || null
            }])
            .select();

        if (error) {
            // Handle duplicate entry gracefully
            if (error.code === '23505') { // Unique violation
                return res.json({ success: true, message: 'You are already on the waitlist!' });
            }
            throw error;
        }

        res.json({ success: true, message: 'Added to waitlist successfully.' });
    } catch (error) {
        console.error('Waitlist Error:', error);
        res.status(500).json({ error: 'Failed to join waitlist.', details: error.message || error });
    }
});

module.exports = router;
