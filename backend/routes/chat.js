const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../utils/supabase'); // Service role client
const { requireAuth } = require('./auth');
const { hasUnlimitedAccess } = require('../utils/accessControl');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Default model - User Requested 2.5 Flash
const CHAT_MODEL = process.env.MODEL_NAME || 'gemini-2.5-flash';

// DEBUG: Check if we can access the question_usage table
router.get('/debug', async (req, res) => {
    try {
        const { data, error } = await supabase.from('question_usage').select('count');
        if (error) throw error;
        res.json({ status: 'ok', message: 'question_usage table is accessible', count: data?.length || 0 });
    } catch (error) {
        console.error('Debug: question_usage check failed:', error);
        res.status(500).json({ error: 'Table check failed: ' + error.message });
    }
});

// POST /api/chat/message
// - Enforces 5-question limit for free users
// - Calls Gemini AI
// - Returns streaming or text response (Starting with text first for reliability)
// POST /api/chat/message
// - Enforces 5-question limit for free users (Guests handled by frontend for now or IP limit later)
// - Calls Gemini AI
// - Returns response
router.post('/message', async (req, res) => {
    const { message, history, language, region, userRole, isShortAnswer } = req.body;
    let user = null;

    // 1. Try to Authenticate (Optional)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token && token !== 'null') {
            try {
                const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
                if (!error && authUser) {
                    user = authUser;
                }
            } catch (err) {
                console.warn("Token validation failed, treating as guest:", err.message);
            }
        }
    }

    try {
        // 2. Access Control (If User Logged In)
        if (user) {
            // Fetch full profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                // Fail safe: If we can't read profile, assume limited user? 
                // Or allow? Let's error to be safe or fallback to limited.
                // For now, let's log and proceed as "User" but check limits carefully.
            }

            const isUnlimited = hasUnlimitedAccess({
                ...profile,
                role: profile?.role || user.user_metadata?.role || 'user'
            });

            console.log(`[CHAT_ACCESS] User: ${user.email}, Role: ${profile?.role || user.user_metadata?.role}, Unlimited: ${isUnlimited}`);

            if (!isUnlimited) {
                // Check usage
                let { data: usage } = await supabase
                    .from('question_usage')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                const currentCount = usage ? usage.questions_count : 0;

                if (currentCount >= 5) {
                    return res.status(403).json({
                        error: 'LIMIT_REACHED',
                        message: 'You used your 5 free questions. Please upgrade your plan to continue.'
                    });
                }

                // Increment Usage
                if (!usage) {
                    await supabase.from('question_usage').insert([{ user_id: user.id, questions_count: 1 }]);
                } else {
                    await supabase.from('question_usage')
                        .update({ questions_count: currentCount + 1 })
                        .eq('user_id', user.id);
                }
            }
        } else {
            console.log('[CHAT_ACCESS] Guest User (Frontend Limits Apply)');
            // Note: In a production app, we should enforce IP rate limits here 
            // to prevent bypassing the frontend counter.
        }

        // 3. Call AI (Gemini)
        // Replicating system instruction from geminiService.ts
        const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

        const systemInstruction = `ROLE:MDnexa™.CTX:${region || 'International'}.USER_ROLE:${userRole || 'User'}.
RULES:
1.ACCURACY:CRITICAL.Double-check dosages.
2.STANDARD:Use standard of care.
3.SOURCE:ALWAYS cite specific guidelines (e.g., ESC 2023, NICE, AHA/ACC) or gold standards for recommendations.
4.TONE:Clinical,objective,professional.
5.ADAPT:Tailor content depth/focus to USER_ROLE.
6.LANG:Respond in ${language || 'English'}.
7.NO hallucination.
${(isShortAnswer === true || isShortAnswer === 'true') ? 'CONSTRAINT:TELEGRAPHIC_MODE.Max 3 bullets.Fragments only(No full sentences).No filler.Facts only.' : ''}
FORMAT:No markdown tables.Use lists/headers.`;

        console.log('[CHAT_DEBUG] System Instruction Constraint:', (isShortAnswer === true || isShortAnswer === 'true') ? 'TELEGRAPHIC' : 'Norm');
        console.log('[CHAT_DEBUG] Max Tokens:', (isShortAnswer === true || isShortAnswer === 'true') ? 1000 : 2048);

        // Format history
        // Gemini requires history to start with 'user' role.
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Remove leading model messages (e.g. Welcome message)
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const chat = model.startChat({
            history: formattedHistory,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                maxOutputTokens: 4096, // SAFETY: Set high to prevent mid-sentence cutoffs. Prompt controls brevity.
                temperature: 0.7
            }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.json({ text: responseText });

    } catch (error) {
        console.error('Chat API Error:', error);
        // Log deep details if available (Google API errors often hide details in response)
        if (error.response) {
            console.error('Google API Error Response:', JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({
            error: error.message || 'AI Generation Failed',
            details: 'Check backend logs for model/API errors'
        });
    }
});

module.exports = router;
