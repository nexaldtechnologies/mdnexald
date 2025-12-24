const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabase');
const transporter = require('../utils/email');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.trial_will_end':
                await handleTrialWillEnd(event.data.object);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error handling webhook event:', error);
        return res.status(500).send('Webhook handler failed');
    }

    res.send();
});

async function handleTrialWillEnd(subscription) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email') // Assuming email might be in profile or we use customer email
        .eq('stripe_customer_id', subscription.customer)
        .single();

    // Fallback email from subscription object if profile doesn't have it (likely)
    const email = subscription.customer_email || (profile ? profile.email : null); // Note: Profile table usually doesn't have email in Supabase, check Auth or Customer

    if (email) {
        console.log(`[WEBHOOK] Trial Ending Soon for ${email}. Sending notification.`);
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"MDnexa Support" <support@mdnexa.com>',
                to: email,
                subject: 'Your Free Trial is Ending Soon - MDnexa',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #059669;">Your Free Trial is Ending Soon</h2>
                        <p>Hello,</p>
                        <p>We hope you're finding MDnexa valuable for your clinical practice.</p>
                        <p>This is a friendly reminder that your free trial will end in <strong>3 days</strong>.</p>
                        <p>To avoid any interruption in service, please ensuring your payment method is up to date.</p>
                        <p style="margin: 20px 0;">
                            <a href="https://www.mdnexa.com/settings" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Subscription</a>
                        </p>
                        <p>If you have any questions, simply reply to this email.</p>
                        <p>Best regards,<br/>The MDnexa Team</p>
                    </div>
                `
            });
        } catch (err) {
            console.error("Failed to send trial end email:", err);
        }
    }
}

async function handleCheckoutSessionCompleted(session) {
    // ... existing ...
}

async function handleSubscriptionUpdated(subscription) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single();

    if (profile) {
        await supabase
            .from('subscriptions')
            .upsert({
                user_id: profile.id,
                stripe_customer_id: subscription.customer,
                stripe_subscription_id: subscription.id,
                plan_id: subscription.items.data[0].price.id,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000),
            }, { onConflict: 'stripe_subscription_id' });

        // Update Role based on new status
        let newRole = 'user'; // Default fallback
        if (subscription.status === 'trialing') {
            newRole = 'user_verified_freetrial';

            // SEND TRIAL START EMAIL
            // Try to get email from subscription or assume we can't reliably get it without an extra lookup
            // For simplicity, we'll try customer_email from the subscription object if available
            const email = subscription.customer_email; // Often null in updates unless expanded
            if (email) { // Only send if we have the email right here
                try {
                    await transporter.sendMail({
                        from: process.env.SMTP_FROM || '"MDnexa Support" <support@mdnexa.com>',
                        to: email,
                        subject: 'Welcome to your MDnexa Free Trial',
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #059669;">Welcome to MDnexa!</h2>
                                <p>Your free trial has officially started. You now have full access to our AI-powered clinical tools.</p>
                                <p>Explore the dashboard to get started:</p>
                                <p style="margin: 20px 0;">
                                    <a href="https://www.mdnexa.com/dashboard" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                                </p>
                                <p>Best regards,<br/>The MDnexa Team</p>
                            </div>
                        `
                    });
                } catch (e) { console.error("Failed to send trial start email", e); }
            }

        } else if (subscription.status === 'active') {
            newRole = 'user_verified_paid';
        } else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(subscription.status)) {
            newRole = 'user_verified_trialdone'; // Trial ended without payment -> Limit access & prevent retrial
        }

        await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id);
        console.log(`[WEBHOOK] Profile ${profile.id} role updated to: ${newRole} (Status: ${subscription.status})`);
    }
}

module.exports = router;
