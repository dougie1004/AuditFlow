

import { AUDIT_AREAS, CRITICAL_VIOLATIONS } from "../data/mockData";

// Note: We use the secure Vercel Serverless Function route (/api/gemini)
// The GEMINI_API_KEY is stored server-side and is NOT exposed to the client.

// `contents` parameter should be an array of parts, as expected by Gemini API.
export const sendMessageToGemini = async (contents: any[], systemInstruction: string, requestType: string, hasUploadedFiles: boolean): Promise<any> => { // Added requestType and hasUploadedFiles
  try {
    // The context is now passed dynamically from AIChat.tsx based on the user's prompt
    // and the specific AI Studio system instruction.
    const context = systemInstruction;

    // Call our own backend API route instead of Gemini API directly
    const apiResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents, context, requestType, hasUploadedFiles }), // Pass requestType and hasUploadedFiles
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({})); // Gracefully handle non-json responses
      throw new Error(errorData.error || `서버 오류: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data; // Return full data including response and requestType

  } catch (error: any) { // Type error as any
    console.error("API call error:", error);
    // Return a structured error if possible
    return { error: error.message || "AuditFlow AI에 연결하는 중 오류가 발생했습니다. Vercel 프로젝트에 `GEMINI_API_KEY` 환경 변수가 올바르게 설정되었는지 확인해주세요." };
  }
};