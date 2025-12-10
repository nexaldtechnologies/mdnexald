const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabase');
const { requireAuth } = require('./auth');

const router = express.Router();

// Price tier configuration
const PUBLIC_PAID_PRICES = {
    monthly: 'price_1SYuANFvNzuNoc9FLyLTf8ny',
    yearly: 'price_1SYuB2FvNzuNoc9FjxK1LNyV'
};

const TEAM_FREE_PRICES = [
    'price_1SYuANFvNzuNoc9FLyLTf8ny',  // Admin free
    'price_1SZ697FvNzuNoc9FmEi2o0aG',  // Friends free
    'price_1SZ69SFvNzuNoc9F3gKvme1n',  // Team lifetime
    'price_1SZ6BaFvNzuNoc9FAnh104Sn'   // Team temporary
];

// Create Stripe Checkout Session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
    const { priceId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    try {
        // Get or create customer
        let { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { userId },
            });
            customerId = customer.id;
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        // Determine if this is a public paid plan (eligible for 30-day trial)
        const isPublicPaidPlan = Object.values(PUBLIC_PAID_PRICES).includes(priceId);
        const isTeamFreePlan = TEAM_FREE_PRICES.includes(priceId);

        // Build checkout session configuration
        const sessionConfig = {
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/pricing`,
            metadata: {
                userId: userId
            }
        };

        // Add 30-day trial for public paid plans only
        if (isPublicPaidPlan && !isTeamFreePlan) {
            sessionConfig.subscription_data = {
                trial_period_days: 30
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Subscription Status
router.get('/status', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        res.json({ subscription });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Billing Portal Session
router.post('/create-portal-session', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (!profile?.stripe_customer_id) {
            return res.status(400).json({ error: 'No Stripe customer found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/dashboard`,
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
