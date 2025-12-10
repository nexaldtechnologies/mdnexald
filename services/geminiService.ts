
import { GoogleGenAI, Content, Modality } from "@google/genai";
import { GenerateStreamParams, Role } from "../types";
import { MODEL_NAME } from "../constants";

let aiInstance: GoogleGenAI | null = null;

const getAIInstance = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

// --- Audio Decoding Helpers for Gemini TTS ---

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  const ai = getAIInstance();

  // Truncate to avoid payload limits (4500 chars is a safe limit for stability)
  const safeText = text.slice(0, 4500);

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: safeText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' }, // Deep, resonant professional male voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;

      // Return raw PCM data (Uint8Array) so the component can manage the AudioContext efficiently
      return decodeBase64(base64Audio);

    } catch (error: any) {
      // If we've reached max retries, log the final error and return null
      if (attempt === maxRetries) {
        console.warn(`Speech generation failed after ${maxRetries} attempts.`);
        return null;
      }

      // Exponential backoff: Wait 500ms, 1000ms, 2000ms before retrying
      const delay = 500 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
};

export const transcribeAudio = async (audioBase64: string, mimeType: string, languageCode: string = 'en-US'): Promise<string> => {
  const ai = getAIInstance();

  try {
    // Optimized Token-Efficient Prompt
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: `ROLE:Medical Transcriptionist.TASK:Verbatim transcription.LANG:${languageCode}.RULES:1.Write EXACT text.2.NO answering questions.3.Exact medical terms.4.Ignore noise.`
          }
        ]
      }
    });
    return response.text ? response.text.trim() : "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

export const lookupMedicalTerm = async (term: string, region: string = 'International', language: string = 'en-US'): Promise<string> => {
  const ai = getAIInstance();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Define the medical term "${term}". 
      CONTEXT: Medical Dictionary for Clinicians (${region}).
      TARGET_LANGUAGE_CODE: ${language}.
      
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
      
      Keep it structured, concise, and professional. No conversational filler.`,
    });
    return response.text ? response.text.trim() : "Definition not found.";
  } catch (error) {
    console.error("Dictionary lookup error:", error);
    throw new Error("Failed to retrieve definition.");
  }
};

import { apiFetch } from "./api";

// Replaced client-side streaming with Backend API call to enforce limits
export const streamChatResponse = async ({
  history,
  newMessage,
  region,
  country,
  userRole,
  isShortAnswer,
  language = 'English',
  onChunk,
  signal,
}: GenerateStreamParams): Promise<string> => {

  try {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const data = await apiFetch('/chat/message', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: newMessage,
        history,
        region,
        country,
        userRole,
        language,
        isShortAnswer
      }),
      signal
    });

    // apiFetch now throws on error, so manual !response.ok check is not needed.
    // If we're here, it's successful.

    // However, we might want to catch specific error codes if apiFetch attaches them.
    // My implemented apiFetch sets (error as any).status.

    if (!data || !data.text) {
      throw new Error('Invalid response format');
    }

    const fullText = data.text;

    // Simulate streaming for UI compatibility
    onChunk(fullText);
    return fullText;

  } catch (error: any) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("DEBUG: Backend Chat API Error Details:", {
      message: error.message,
      stack: error.stack,
      url: '/chat/message'
    });
    throw error;
  }
};

export const generateRelatedQuestions = async (
  lastMessage: string,
  lastResponse: string,
  userRole: string,
  language: string = 'English'
): Promise<string[]> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `TASK: Generate 2 short, clinically relevant follow-up questions based on the previous Q&A.
            CONTEXT: User is a ${userRole}. Language: ${language}.
            USER QUESTION: ${lastMessage}
            AI ANSWER: ${lastResponse}
            
            RULES:
            1. Questions must be brief (max 10 words).
            2. Questions must be medically relevant/logical next steps (e.g., treatment, adverse effects, differential).
            3. LANGUAGE: Generate the questions in ${language}.
            4. OUTPUT: Strictly a JSON array of 2 strings. Example: ["Check interactions?", "Dosage for peds?"]`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate related questions:", error);
    return [];
  }
};
