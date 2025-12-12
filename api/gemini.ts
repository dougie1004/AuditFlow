import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a server-side file. `process.env` is secure here.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  // This error will be visible in Vercel logs, not to the user.
  console.error("API_KEY environment variable is not set.");
  // We send a generic error to the client for security.
  // We can't proceed without a key.
}

// Initialize the client only if the API key is available.
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// This is the serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!aiClient) {
    return res.status(500).json({ error: 'AI 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: '메시지가 필요합니다.' });
  }

  try {
    const model = 'gemini-2.5-flash';
    const response = await aiClient.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: context,
      }
    });

    const text = response.text || "데이터를 처리했으나 응답을 생성할 수 없습니다.";
    return res.status(200).json({ response: text });

  } catch (error) {
    console.error("Gemini API Error from serverless function:", error);
    return res.status(500).json({ error: 'AI 모델로부터 응답을 가져오는 데 실패했습니다.' });
  }
}
