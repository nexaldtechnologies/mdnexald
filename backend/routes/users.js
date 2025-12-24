const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('./auth');
const transporter = require('../utils/email');

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

        // Merge Auth Data (Role/Metadata) into the Profile Response
        // Priority: DB Profile Role >> Auth Metadata >> Default 'user'
        const dbRole = data?.role;
        const authRole = req.user.role === 'authenticated' ? (req.user.app_metadata?.role) : req.user.role;

        const finalRole = dbRole || authRole || 'user';

        const enhancedProfile = {
            ...data,
            role: finalRole,
            // Pass through metadata for backup checks
            app_metadata: req.user.app_metadata,
            user_metadata: req.user.user_metadata,
            email: req.user.email
        };

        res.json(enhancedProfile);
    } catch (error) {
        console.error('[USERS_API] /me Error:', error);
        console.error('[USERS_API] Supabase Key Used (first 5 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) : 'MISSING');
        res.status(500).json({
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
    }
});

// Update Profile
router.patch('/update-profile', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { full_name, role, specialty } = req.body;

    try {
        const updates = {
            updated_at: new Date().toISOString(),
        };

        if (full_name !== undefined) updates.full_name = full_name;
        if (role !== undefined) updates.role = role;
        if (specialty !== undefined) updates.specialty = specialty; // Ensure 'specialty' column exists in Supabase schema or is handled

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, profile: data });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deactivate/Delete Account
router.delete('/delete-account', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        // Send Goodbye Email
        const email = req.user.email;
        if (email) {
            try {
                const fromAddr = process.env.MAIL_FROM || '"MDnexa Support" <noreply@mdnexa.com>';
                console.log('[USER_DELETE_DEBUG] Sending goodbye email:', { from: fromAddr, to: email });

                await transporter.sendMail({
                    from: fromAddr,
                    to: email,
                    subject: 'Your account has been deactivated - MDnexa',
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>Account Deactivated</h2>
                            <p>We're sorry to see you go. Your account has been successfully deactivated and your data has been removed.</p>
                            <p>If you change your mind, you will need to create a new account.</p>
                            <p>Best regards,<br>The MDnexa Team</p>
                        </div>
                    `,
                });
                console.log('Deactivation email sent to', email);
            } catch (emailError) {
                console.error('Failed to send deactivation email:', emailError);
                // Continue with deletion even if email fails
            }
        }

        // Delete user from Supabase Auth (admin privilege required)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account. Please try again.' });
    }
});

// Check Email Existence (For Password Reset Feedback)
router.post('/check-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Use Admin API to list users by email
        // Note: listUsers isn't filterable by email strictly in all versions, 
        // but often easiest is to use listUsers() and filter or use getUserById if we had ID.
        // Actually, creating a client with the service role allows row-level bypass on profiles if strict,
        // but 'auth.users' is separate.
        // Best approach with Admin API: listUsers({ query: email }) often works or search.

        // Wait, listUsers might be heavy if many users.
        // Better: Attempt to get user by email is not a standard admin function? 
        // Actually, supabase.auth.admin.listUsers() supports partial search.

        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) throw error;

        // Perform strict match
        const userExists = users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());

        res.json({ exists: userExists });
    } catch (error) {
        console.error('Error checking email:', error);
        // Fail open (say false or error) to be safe, or just 500
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
