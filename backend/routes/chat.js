const express = require('express');
const robustGemini = require('../utils/robustGemini'); // [NEW] Use Robust Client
const supabase = require('../utils/supabase'); // Service role client
const { requireAuth } = require('./auth');
const { hasUnlimitedAccess } = require('../utils/accessControl');

const router = express.Router();

console.log("[Chat Route] Logic Loaded"); // Debug


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
// - Enforces 5-question limit for free users (Guests handled by frontend for now or IP limit later)
// - Calls Gemini AI via Robust Client (Auto-retry, Auto-fallback)
// - Returns response
router.post('/message', async (req, res) => {
    const { message, history, language, region, country, userRole, isShortAnswer } = req.body;
    let user = null;

    // 1. Try to Authenticate (Optional)
    // 1. Try to Authenticate (Optional or Static)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token && token !== 'null') {
            // Check Static Token First
            if (process.env.MDNEXA_API_TOKEN && token === process.env.MDNEXA_API_TOKEN) {
                console.log('[CHAT_AUTH] Static API Token detected. Granting Service Access.');
                user = {
                    id: 'service-account-gpt',
                    email: 'gpt@mdnexa.com',
                    role: 'service_role',
                    user_metadata: { role: 'service_role', professional_role: 'AI Assistant' }
                };
            } else {
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
    }

    let professionalRole = (userRole && !userRole.includes('unpaid') && !userRole.includes('verified')) ? userRole : 'User'; // Default to User if role is internal status

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

            // --- ROLE SEPARATION LOGIC ---
            // 1. SYSTEM ROLE (For Permissions/Limits)
            // collect ALL roles to ensure if *any* source says admin, we treat as admin.
            const allRoles = [
                profile?.role,
                user.role,
                user.user_metadata?.role,
                user.app_metadata?.role
            ].filter(Boolean);

            const isUnlimited = hasUnlimitedAccess({
                ...user, // auth user
                ...profile, // profile attributes
                roles: allRoles // Explicit list of all found roles
            });

            console.log(`[CHAT_ACCESS] User: ${user.email}, Roles Detected: ${allRoles.join(', ')}, Unlimited: ${isUnlimited}`);

            // 2. MEDICAL PERSONA (For AI Context)
            // The AI should NOT know you are an "admin". It needs to know if you are a Doctor, Nurse, Student.
            // Priority: Explicit Profile Field > User Metadata > requestedRole > Default
            professionalRole = profile?.professional_role || profile?.specialty || profile?.title || user.user_metadata?.professional_role || professionalRole;

            console.log(`[CHAT_CONTEXT] Medical Persona: ${professionalRole}`);

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

        // 3. Prepare System Instruction
        const systemInstructionText = `ROLE: Expert Clinical Consultant (MD/Specialist level) for MDnexa™.
CONTEXT: Country = ${country || 'International'}, Region = ${region || 'International'}. User Role = ${professionalRole}.

CORE MANDATES:
1. SCOPE: Answer medical, clinical, healthcare, biological, and health-administration questions.
   - INCLUSION: Symptoms, treatments, drugs, anatomy, physiology, mental health, medical coding, and patient communication.
   - LANGUAGE: YOU MUST SUPPORT ALL LANGUAGES. Did the user ask in Spanish, Hindi, or Chinese? ANSWER IN THAT LANGUAGE. Do not refuse valid medical questions just because they are not in English.
   - DETECTION: Translate the query internally to check for medical context before refusing. e.g., "Mal di testa" is "Headache" (Medical) -> Answer it.
   - REFUSAL: Only refuse if the topic is CLEARLY non-medical (e.g., "Write a poem about cars", "Who won the World Cup"). If it's borderline (e.g. "Diet", "Exercise", "Stress"), ANSWER IT from a clinical perspective.
2. STRICT LOCALIZATION & RECENCY (The Golden Rule):
   - LATEST GUIDELINES ONLY: Always prioritize the MOST RECENT published guidelines available to you.
   - PRIMARY AUTHORITY: You MUST use ${country ? country.toUpperCase() + '-' : ''}SPECIFIC guidelines (e.g., if India -> ICMR, API, FOGSI; if Germany -> AWMF, DGK; if USA -> AHA/ACC).
   - STRICT EXCLUSION: DO NOT use guidelines from other countries.
     - IF Country = "United States": USE ONLY USA GUIDELINES (AHA, ACC, IDSA, USPSTF). AUTOMATICALLY FILTER OUT Indian, European (ESC), or Asian guidelines unless explicitly requested.
     - IF Country = "India": USE ONLY INDIAN GUIDELINES (ICMR, API, FOGSI). FILTER OUT US/UK guidelines as primary.
   - FALLBACK HIERARCHY:
     1. Local National Guidelines (Top Priority)
     2. Major Regional Guidelines (e.g., ESC for Europe) - ONLY if no local guideline exists.
     3. International Guidelines (WHO, KDIGO) - As a last resort.
   - NEGATIVE CONSTRAINT: If the user selected a specific region/country, and you output a source from a completely different region (e.g. citing an Indian journal for a US user), YOU HAVE FAILED. CHECK YOUR SOURCE ORIGIN BEFORE OUTPUTTING.
   - FALLBACK STATEMENT: If you must fallback from a local guideline, YOU MUST STATE: "No specific guideline for ${country} found; referencing [Standard Used]."
3. CLINICAL ACCURACY: 
   - 100% medically correct.
   - Double-check all dosages, interactions, and contraindications.
   - Use standard medical terminology.
4. REFERENCES: MANDATORY & LOCALIZED. 
   - CITATIONS MUST MATCH THE LOCATION (${country || region}).
   - NO PLACEHOLDERS: 
     - FORBIDDEN TEXT: "[Insert guideline name]", "[Specific National Guidelines]", "[If available]", "[relevant guideline]".
     - RULE: You must RESOLVE the source. Either name the actual guideline (e.g., "ICMR 2019") OR fallback to the major Regional/International standard. NEVER output a bracketed instruction.
     - INCORRECT: "Source: [Japan Guideline if available]"
     - CORRECT: "Source: JCS 2021 Guideline." OR "Specific Japan guideline unavailable; sourcing ESC 2023 (Europe)."
   - Every major clinical claim must be supported by an EXACT reference.
   - Provide a "Sources" list at the end.
5. TONE: Professional, objective, concise.
6. LANGUAGE & SCRIPT: 
   - PRIMARY LANGUAGE: Respond in ${language || 'English'}.
   - CITATION PROTECTION: DO NOT TRANSLATE JOURNAL NAMES, ARTICLE TITLES, OR AUTHOR NAMES. Keep them in their original publication language (usually English).
   - SCRIPT INTEGRITY: Ensure the entire response uses the script of the requested language (${language || 'English'}). Do not mix scripts (e.g., no Bengali script in an English response) except for necessary original terms.
7. NO HALLUCINATION. Do not invent sources.

8. ROLE ADAPTATION:
${(professionalRole?.toLowerCase().includes('student'))
                ? '   - AUDIENCE: Medical/Nursing Student. PROVIDE EXPLANATIONS. explain complex terms briefly. Focus on pathophysiology and "why". Do NOT simplify, but ELABORATE.'
                : (professionalRole?.toLowerCase().includes('physician') || professionalRole?.toLowerCase().includes('doctor') || professionalRole?.toLowerCase().includes('nurse') || professionalRole?.toLowerCase().includes('pharmacist') || professionalRole?.toLowerCase().includes('clinician'))
                    ? '   - AUDIENCE: Clinical Expert. PROVIDE DEPTH. Skip basic definitions. Focus on advanced management, nuanced guidelines, drug interactions, and clinical pearls.'
                    : '   - AUDIENCE: Healthcare Professional. Standard professional medical tone.'}

9. SAFE LANGUAGE & HEDGING (MANDATORY):
   - You MUST qualify definitive statements with hedging phrases to ensure safety.
   - REQUIRED VOCABULARY: Use terms like "Consider", "May", "Suggest", "In some scenarios", "It depends on", "Evidence suggests".
   - BALANCE: Be confident and authoritative, but ALWAYS use these safe words to acknowledge clinical variability.
   - AVOID absolutes (e.g., "Always", "Never", "Must") unless referencing a specific strict protocol.

${(isShortAnswer === true || isShortAnswer === 'true') ? 'CONSTRAINT: Concise Mode. Max 3 key points. Use outlines/bullets. No filler words.' : ''}

FORMAT: Structured markdown (headers, bullets). No tables.`;

        console.log('[CHAT_DEBUG] System Instruction Constraint:', (isShortAnswer === true || isShortAnswer === 'true') ? 'TELEGRAPHIC' : 'Norm');
        console.log('[CHAT_DEBUG] Max Tokens:', (isShortAnswer === true || isShortAnswer === 'true') ? 1000 : 2048);

        // 4. Format History
        // Gemini requires history to start with 'user' role.
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Remove leading model messages (e.g. Welcome message)
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        // 5. CALL ROBUST AI wrapper
        const { text: responseText, model: usedModel } = await robustGemini.generateMessage({
            message,
            history: formattedHistory,
            systemInstruction: systemInstructionText,
            temperature: 0.7,
            maxOutputTokens: 4096
        });

        // 6. Persistence (If User Logged In & Session Provided)
        if (user && req.body.sessionId) {
            const persistMessages = async () => {
                // Save User Message
                await supabase.from('chat_messages').insert({
                    session_id: req.body.sessionId,
                    user_id: user.id,
                    role: 'user',
                    content: message
                });

                // Save AI Response
                await supabase.from('chat_messages').insert({
                    session_id: req.body.sessionId,
                    user_id: user.id,
                    role: 'model',
                    content: responseText
                });

                // Touch Session Updated At
                await supabase.from('chat_sessions')
                    .update({ updated_at: new Date() })
                    .eq('id', req.body.sessionId);
            };

            let persistenceSuccess = false;

            try {
                await persistMessages();
                persistenceSuccess = true;
            } catch (dbError) {
                console.warn("Initial persistence failed, checking for missing session...", dbError.message);

                // Check if error is related to foreign key (missing session)
                if (dbError.code === '23503' || dbError.message?.includes('foreign key') || dbError.details?.includes('is not present in table "chat_sessions"')) {
                    try {
                        console.log("Creating missing session just-in-time:", req.body.sessionId);
                        // Create the session with the ID we have
                        await supabase.from('chat_sessions').insert({
                            id: req.body.sessionId,
                            user_id: user.id,
                            title: 'Rescued Session', // Debug: Identify if JIT logic ran
                            region: region || 'International',
                            country: country || 'International'
                        });

                        // Retry persistence
                        await persistMessages();
                        persistenceSuccess = true;
                    } catch (retryError) {
                        console.error("Failed to recover session and persist messages:", retryError);
                    }
                } else {
                    console.error("Database persistence error:", dbError);
                }
            }

            // --- SMART AUTO-NAMING ---
            // Triggers ONLY on the first message (History <= 2 to be safe)
            const isFirstMessage = formattedHistory.length <= 2;

            if (persistenceSuccess && isFirstMessage) {
                // Fire and Forget (Async)
                (async () => {
                    let finalTitle = null;
                    try {
                        // 1. Try AI Summary (Fastest Default Model)
                        const { result } = await robustGemini.generateContent({
                            featureName: 'chat',
                            contents: [{
                                role: 'user',
                                parts: [{
                                    text: `Summarize this in 3-5 words for a chat title: "${message}"`
                                }]
                            }]
                        });
                        finalTitle = result.response.text().replace(/\*/g, '').trim();
                    } catch (error) {
                        // 2. Fallback: Simple Truncation (If AI fails, just use the question)
                        console.warn("[TITLE] AI Generation failed, using fallback:", error.message);
                        const words = message.split(/\s+/);
                        finalTitle = words.length > 7 ? words.slice(0, 7).join(' ') + '...' : message;
                    }

                    // 3. Save Title (AI or Fallback)
                    if (finalTitle) {
                        // Ensure it's not too long
                        if (finalTitle.length > 50) finalTitle = finalTitle.substring(0, 47) + '...';

                        console.log(`[TITLE] Saving: "${finalTitle}"`);
                        await supabase.from('chat_sessions')
                            .update({ title: finalTitle })
                            .eq('id', req.body.sessionId);
                    }
                })();
            }
        }

        res.json({ text: responseText, model: usedModel }); // Optional: return usedModel for debug UI

    } catch (error) {
        console.error('Chat API Error:', error);

        const errorMessage = error.message || "Unknown AI Error";

        // Return 500 (Clean JSON, safe for Vercel)
        if (!res.headersSent) {
            res.status(500).json({
                error: "AI_GENERATION_FAILED",
                message: "The AI service encountered an error. Please try again.",
                details: errorMessage // Safe string
            });
        }
    }
});

module.exports = router;
