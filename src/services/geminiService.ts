

import { ChatMessage } from "../types";

export interface GeminiResponse {
  response?: string;
  error?: string;
  requestType?: string;
}

// Note: We use the secure Vercel Serverless Function route (/api/gemini)
// The GEMINI_API_KEY is stored server-side and is NOT exposed to the client.

// `contents` parameter should be an array of parts, as expected by Gemini API.
export const sendMessageToGemini = async (
  contents: { role: string; parts: { text: string }[] }[],
  systemInstruction: string,
  requestType: string,
  hasUploadedFiles: boolean
): Promise<GeminiResponse> => {
  try {
    const context = systemInstruction;

    // Call our own backend API route instead of Gemini API directly
    const apiResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents, context, requestType, hasUploadedFiles }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 오류: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data as GeminiResponse;

  } catch (error: any) {
    console.error("API call error:", error);
    return { error: error.message || "AuditFlow AI에 연결하는 중 오류가 발생했습니다." };
  }
};
