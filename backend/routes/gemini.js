const express = require('express');
const robustGemini = require('../utils/robustGemini');
const router = express.Router();

// Helper for Audio Decoding (if needed, but here we process text-to-speech)
// Text-to-Speech Endpoint
// Text-to-Speech Endpoint
const googleTTS = require('google-tts-api'); // [NEW] Reliable Free TTS

router.post('/speech', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        // Gemini 1.5 Flash does NOT support Audio Output via REST API (confirmed by 404 error).
        // We fallback to Google TTS API which is fast and reliable.
        const safeText = text.slice(0, 4500);

        // Get Audio Base64 (up to 200 chars for instant preview, or split loop for full)
        // User priority is functionality.
        const audioBase64 = await googleTTS.getAudioBase64(safeText.substring(0, 200), {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        if (!audioBase64) throw new Error("No audio data generated");

        res.json({ audioData: audioBase64 });
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

        const { result } = await robustGemini.generateContent({
            featureName: 'transcription',
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
                            text: `ROLE: Expert Medical Transcriptionist.
TASK: Transcribe the audio verbatim. 
LANG: ${languageCode || 'en-US'}.
RULES:
1. Capture EXACT medical terminology, drug names, and dosages.
2. Do NOT paraphrase or summarize. Write exactly what is said.
3. If background noise is present, focus only on the voice.
4. Use correct capitalization for proprietary drug names.
5. If a term is ambiguous, use the most likely clinical spelling based on context.`
                        }
                    ]
                }
            ],
            forceModel: 'gemini-1.5-flash-001' // Force stable model version for audio
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
        const { term, region, language, mode } = req.body; // mode: 'concise' | 'detailed'

        let prompt;
        if (mode === 'concise') {
            prompt = `Define the medical term "${term}" VERY CONCISELY.
       CONTEXT: Medical Dictionary for Clinicians (${region || 'International'}).
       TARGET_LANGUAGE_CODE: ${language || 'en-US'}.
       
       INSTRUCTIONS:
       1. Provide ONLY the definition in a single, clear paragraph (max 2-3 sentences).
       2. Focus directly on the clinical essence.
       3. NO bullet points, NO "Key Points" headers, NO filler.
       4. Translate term name if needed, but keep output minimal.`;
        } else {
            prompt = `Define the medical term "${term}". 
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
       - [Bullet 1]
       - [Bullet 2]
       
       **Common Pitfalls**:
       - [Mistake or confusion to avoid]
       
       **Terminology**:
       - **Synonyms**: [List]
       - **Abbreviations**: [List as [Term](term:Term)]
       - **Related Terms**: [List as [Term](term:Term)]
       
       Keep it structured, concise, and professional. No conversational filler.`;
        }

        const { result } = await robustGemini.generateContent({
            featureName: 'dictionary',
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
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

        const { result } = await robustGemini.generateContent({
            featureName: 'related_questions',
            generationConfig: { responseMimeType: 'application/json' },
            contents: [{
                role: 'user',
                parts: [{
                    text: `TASK: Generate 2 short, clinically relevant, but LOGICALLY DIVERSE follow-up questions.
            CONTEXT: User is a ${userRole}. Language: ${language} (Match this language strictly).
            USER QUESTION: "${lastMessage.substring(0, 200)}"
            AI ANSWER: "${lastResponse.substring(0, 200)}"
            
            RULES:
            1. Questions must be brief (max 6-8 words).
            2. DIVERSITY & CREATIVITY: 
               - Q1 MUST focus on: Management / Treatment / Dosage / Guidelines.
               - Q2 MUST focus on: Differential Diagnosis / Complications / Pathophysiology / Red Flags.
               - The questions MUST cover COMPLETELY different aspects.
            3. ROLE: Questions should sound like they come from a ${userRole}.
            4. LANGUAGE: Must be in ${language}. Ensure natural phrasing in ${language}. 
               - DO NOT translate literally from English structure. 
               - Use idiomatic medical phrasing for ${language}.
               - AVOID repeating the same starting words (e.g., "What is...", "How to..."). VARY the sentence structure.
            5. OUTPUT: Strictly a JSON array of 2 strings.
            6. FORBIDDEN PHRASING:
               - DO NOT start with "Do you...", "Can you...", "Have you...", "Should I...".
               - Must be direct queries (e.g., "Treatment for X", "Dosage of Y", "Differential diagnosis of Z").`
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

// ICD-10 Code Checker Endpoint
router.post('/icd10', async (req, res) => {
    try {
        const { query, region, country, contextChips, mode, language, standard: explicitStandard } = req.body;

        // Determine Standard
        let standard = explicitStandard || "ICD-10 (WHO 2019)";

        // Only derive from country if standard wasn't explicitly provided
        if (!explicitStandard) {
            // North America
            if (country === 'United States') standard = "ICD-10-CM (2024 US Clinical Modification)";
            if (country === 'Canada') standard = "ICD-10-CA (Canadian Modification)";

            // Europe
            if (country === 'Germany') standard = "ICD-10-GM (German Modification)";
            if (country === 'United Kingdom') standard = "ICD-10 (WHO) / SNOMED CT Mapping";
            if (country === 'France') standard = "CIM-10 (Classification internationale des maladies)";
            if (country === 'Spain' || country === 'Mexico') standard = "CIE-10 (Clasificación internacional de enfermedades)";
            if (country === 'Netherlands') standard = "ICD-10-Dutch";
            if (country === 'Sweden') standard = "ICD-10-SE";

            // Asia / Pacific
            if (country === 'Australia') standard = "ICD-10-AM (Australian Modification)";
            if (country === 'China') standard = "ICD-10-CN (Chinese Modification)";
            if (country === 'Japan') standard = "ICD-10 (WHO) / Standard Disease Code";
            if (country === 'India') standard = "ICD-10 (WHO)";

            // South America
            if (country === 'Brazil') standard = "CID-10 (Classificação Internacional de Doenças)";

            // Default Logic for broad coverage if not explicitly matched above but in region
            if (!standard.includes(country) && standard === "ICD-10 (WHO 2019)" && country) {
                standard = `ICD-10 (WHO) - ${country} Local Standard`;
            }
        }

        const systemPrompt = `ROLE: Expert Medical Coder & Clinical Documentation Improvement Specialist.
TASK: Identify the most accurate ICD-10 code for the query.
STANDARD: ${standard} (Strictly adhere to this version).
LANGUAGE: Respond in ${language || 'English'}.
QUERY: "${query}"
CONTEXT: ${contextChips ? contextChips.join(', ') : 'None provided'}
MODE: ${mode || 'Standard'} (If 'Quick', be direct. If 'Detailed', provide nuances).

INSTRUCTIONS:
1. Analyze the query for specificity (site, laterality, acornyms, etiology).
2. Identify the PRIMARY best matching code in the requested STANDARD (${standard}).
   - MUST be a LEAF CODE (maximum specificity). Ex: "E11.9" not "E11".
   - If the country is Germany, use strict ICD-10-GM codes.
   - If USA, use ICD-10-CM.
   - If Brazil, use CID-10.
3. RATIONALE: Explain WHY this code fits best (1-2 sentences).
4. CONFIDENCE: Assess match quality (High/Medium/Low).
   - High: Exact match or standard terminology.
   - Medium: Ambiguous term or missing laterality/type.
   - Low: Vague symptom only.
5. ALTERNATIVES: List 2-3 other plausible codes if the primary might be wrong.
6. REFINEMENTS: If confidence is Medium/Low, ask 2-3 specific questions to narrow it down (e.g. "Left or Right?", "Type 1 or 2?").
7. ATTRIBUTES: Flag if it is "Billable" (specific) or "Unspecified".

OUTPUT SCHEMA (Strict JSON):
{
  "primary": {
    "code": "String (Exact code from ${standard})",
    "description": "String (Official description in ${language})",
    "rationale": "String (in ${language})",
    "confidence": "High" | "Medium" | "Low",
    "isBillable": Boolean,
    "synonyms": ["String"],
    "excludes": ["String"]
  },
  "alternatives": [
    { "code": "String", "description": "String", "distinction": "Use this if..." }
  ],
  "refinements": [
    { "question": "String", "options": ["String", "String"] }
  ]
}`;

        const { result } = await robustGemini.generateContent({
            featureName: 'icd10',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });

        const text = result.response.text();
        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json({ ...data, standard }); // Return standard used for UI badges

    } catch (error) {
        console.error('ICD-10 Error:', error);
        res.status(500).json({ error: 'Failed to find ICD-10 code' });
    }
});

// Quick Drug Checker Endpoint
router.post('/drug-check', async (req, res) => {
    try {
        const { drugName, standard, patientGroup, toggles, language } = req.body;

        const systemPrompt = `ROLE: Clinical Pharmacologist & Medical Information Specialist.
TASK: Provide a structured clinical summary for the drug "${drugName}".
STANDARD: ${standard || 'International'} (Prioritize sources like FDA, EMA, or AMG/Fachinformation based on this).
PATIENT GROUP: ${patientGroup || 'Adult'}
LANGUAGE: Respond directly in ${language || 'English'}.
TOGGLES:
- Renal Dosing: ${toggles?.renal ? 'INCLUDE' : 'OMIT'}
- Interactions: ${toggles?.interactions ? 'INCLUDE' : 'OMIT'}
- Pregnancy/Lactation: ${toggles?.pregnancy ? 'INCLUDE' : 'OMIT'}

INSTRUCTIONS:
1. Identify the drug (Brand/Generic) and Class.
2. List KEY indications, standard dosing (for ${patientGroup || 'Adult'}), contraindications, and common adverse effects.
3. If toggles are ON, provide specific details for those sections.
4. TRANSLATE ALL CONTENT VALUES (summary, indications, contraindications, adverse_effects, clinical details, etc.) to ${language || 'English'}. Ensure the entire response is in ${language || 'English'} except for the JSON keys.
5. **IMPORTANT**: DO NOT TRANSLATE THE JSON KEYS. KEEP KEYS IN ENGLISH.
6. FORMAT: JSON only.

OUTPUT SCHEMA (Strict JSON):
{
  "summary": { "name": "String", "brand": "String (Common examples)", "class": "String", "badges": ["String (e.g. Oral, Antibiotic, High Alert)"] },
  "facts": {
    "indications": ["String"],
    "dosing": "String (Concise standard regimen)",
    "contraindications": ["String"],
    "adverse_effects": ["String (Top 5 common/serious)"]
  },
  "clinical": {
    "renal": { "summary": "String (e.g. 'Adjustment required')", "detail": "String" },
    "hepatic": { "summary": "String", "detail": "String" },
    "interactions": { 
       "major": ["String"], 
       "moderate": ["String"] 
    },
    "pregnancy_lactation": { "pregnancy": "String", "lactation": "String" }
  },
  "references": ["String (List 2-3 key reliable sources)"]
}`;

        const { result } = await robustGemini.generateContent({
            featureName: 'drug_check',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });

        const text = result.response.text();
        console.log('Gemini Drug Check Raw Response:', text); // [DEBUG]

        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Fallback for markdown-less JSON if model forgets code block
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3).trim();

        const data = JSON.parse(jsonStr);

        res.json(data);

    } catch (error) {
        console.error('Drug Checker Error:', error);
        res.status(500).json({ error: 'Failed to retrieve drug information', details: error.message });
    }
});

// Drug Interaction Checker Endpoint
router.post('/drug-interaction', async (req, res) => {
    try {
        const { drugA, drugB, standard, patientGroup, language } = req.body;

        const systemPrompt = `ROLE: Clinical Pharmacologist & Drug Safety Specialist.
TASK: Analyze the interaction between "${drugA}" and "${drugB}".
STANDARD: ${standard || 'International'}
PATIENT GROUP: ${patientGroup || 'Adult'}
LANGUAGE: Respond directly in ${language || 'English'}.

INSTRUCTIONS:
1. Determine the SEVERITY (Contraindicated, Major, Moderate, Minor, None).
2. Explain the MECHANISM (e.g. CYP3A4 inhibition, additive pharmacocynamic effect).
3. Provide CLINICAL MANAGEMENT advice (e.g. "Monitor INR", "Avoid combination", "Dose reduction required").
4. TRANSLATE ALL CONTENT to ${language || 'English'}. Ensure the entire response is in ${language || 'English'} except for the JSON keys.
5. FORMAT: JSON only.

OUTPUT SCHEMA (Strict JSON):
{
  "severity": "String (Contraindicated | Major | Moderate | Minor | No Interaction)",
  "mechanism": "String (Concise mechanism explanation)",
  "management": "String (Actionable clinical advice)",
  "description": "String (Detailed interaction summary)"
}`;

        const { result } = await robustGemini.generateContent({
            featureName: 'drug_interaction',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });

        const text = result.response.text();
        console.log('Gemini Interaction Raw Response:', text); // [DEBUG]

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json(data);

    } catch (error) {
        console.error('Drug Interaction Check Error:', error);
        res.status(500).json({ error: 'Failed to check interaction', details: error.message });
    }
});

module.exports = router;
