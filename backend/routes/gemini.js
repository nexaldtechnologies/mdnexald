const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Lazy Init Gemini
let _genAI = null;
const getGenAI = () => {
    if (!_genAI) {
        if (!process.env.GEMINI_API_KEY) {
            console.error('[GEMINI_ERROR] Missing GEMINI_API_KEY');
            throw new Error('Server misconfiguration: Missing AI Key');
        }
        _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return _genAI;
};

// Helper for Audio Decoding (if needed, but here we process text-to-speech)
// Text-to-Speech Endpoint
router.post('/speech', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        // Truncate for safety
        const safeText = text.slice(0, 4500);

        // Retrieve model
        // Note: 'gemini-2.5-flash-preview-tts' might be a specific model name, using fallback if env not set
        const model = getGenAI().getGenerativeModel({
            model: "gemini-2.0-flash-exp",
        });

        const response = await model.generateContent({
            contents: [{ parts: [{ text: safeText }] }],
            config: {
                responseModalities: ["AUDIO"], // Modality.AUDIO
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Charon' },
                    },
                },
            },
        });

        const base64Audio = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data generated");

        res.json({ audioData: base64Audio });
    } catch (error) {
        console.error('Speech Generation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate speech' });
    }
});

// Transcription Endpoint
router.post('/transcribe', async (req, res) => {
    try {
        const { audioBase64, mimeType, languageCode } = req.body;
        if (!audioBase64) return res.status(400).json({ error: 'Audio data required' });

        const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType || 'audio/wav',
                                data: audioBase64
                            }
                        },
                        {
                            text: `ROLE:Medical Transcriptionist.TASK:Verbatim transcription.LANG:${languageCode || 'en-US'}.RULES:1.Write EXACT text.2.NO answering questions.3.Exact medical terms.4.Ignore noise.`
                        }
                    ]
                }
            ]
        });

        const text = result.response.text();
        res.json({ text });
    } catch (error) {
        console.error('Transcription Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Medical Lookup Endpoint
router.post('/lookup', async (req, res) => {
    try {
        const { term, region, language } = req.body;
        const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `Define the medical term "${term}". 
       CONTEXT: Medical Dictionary for Clinicians (${region || 'International'}).
       TARGET_LANGUAGE_CODE: ${language || 'en-US'}.
       
       INSTRUCTIONS:
       1. TRANSLATE the term name/title into the target language specified by ${language}.
       2. Provide the definition and context strictly in the target language.
       
       FORMAT:
       ## [Translated Term Name]
       **Definition**: [Precise clinical definition in target language]
       
       **Clinical Context**: [Brief pathophysiology or relevance in target language]
       
       **Key Points**:
       - [Bullet 1 in target language]
       - [Bullet 2 in target language]
       
       Keep it structured, concise, and professional. No conversational filler.`
                }]
            }]
        });

        res.json({ text: result.response.text() });
    } catch (error) {
        console.error('Lookup Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Related Questions Endpoint
router.post('/related', async (req, res) => {
    try {
        const { lastMessage, lastResponse, userRole, language } = req.body;
        const model = getGenAI().getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `TASK: Generate 2 short, clinically relevant follow-up questions based on the previous Q&A.
            CONTEXT: User is a ${userRole}. Language: ${language}.
            USER QUESTION: ${lastMessage}
            AI ANSWER: ${lastResponse}
            
            RULES:
            1. Questions must be brief (max 10 words).
            2. Questions must be medically relevant/logical next steps (e.g., treatment, adverse effects, differential).
            3. LANGUAGE: Generate the questions in ${language}.
            4. OUTPUT: Strictly a JSON array of 2 strings. Example: ["Check interactions?", "Dosage for peds?"]`
                }]
            }]
        });

        const text = result.response.text();
        res.json(JSON.parse(text)); // Return parsed JSON directly
    } catch (error) {
        console.error('Related Questions Error:', error);
        // Fallback to empty array
        res.json([]);
    }
});

module.exports = router;
