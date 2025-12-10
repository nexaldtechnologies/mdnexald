
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

// Correct chat endpoint path based on usage in geminiService.ts
export const CHAT_API_URL = `${API_BASE_URL}/api/chat/message`;

export default API_BASE_URL;
