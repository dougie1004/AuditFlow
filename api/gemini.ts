
import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a server-side file. `process.env` is secure here.
const apiKey = process.env.GEMINI_API_KEY;

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

  const { contents, context, requestType, hasUploadedFiles } = req.body; // Added requestType and hasUploadedFiles

  if (!contents) { // Check if contents array is provided
    return res.status(400).json({ error: '컨텐츠가 필요합니다.' });
  }

  try {
    let model = 'gemini-3-flash-preview'; // Default for basic text tasks
    // Use gemini-3-pro-preview for all complex tasks to leverage "latest performance"
    if (requestType === 'audit-findings' || requestType === 'document-analysis' || requestType === 'sql-generation' || requestType === 'inventory-analysis' || requestType === 'self-learning-explanation' || requestType === 'checklist-generation' || requestType === 'general-chat') {
      model = 'gemini-3-pro-preview';
    }

    const generationConfig: any = {
      systemInstruction: context,
      // Default configs for general quality
      topK: 64,
      topP: 0.95,
      temperature: 0.7, // Slightly lower temperature for more factual/audit-like responses
    };

    // Conditionally apply responseMimeType and responseSchema for audit-findings
    // ONLY when fallback mock data is used (i.e., NO relevant uploaded files were passed from client).
    // If uploaded files are present, Gemini provides natural language summary.
    if (requestType === 'audit-findings' && !hasUploadedFiles && context.includes('JSON 형식의 법인카드 거래 데이터를 분석')) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            row_index: {
              type: Type.STRING,
              description: 'Original data row number or identifier.'
            },
            title: {
              type: Type.STRING,
              description: 'Summary title of the identified issue.'
            },
            description: {
              type: Type.STRING,
              description: 'Detailed explanation of the anomaly, evidence, and analysis.'
            },
            severity: {
              type: Type.STRING,
              description: 'Risk level of the detected issue.',
              enum: ['High', 'Medium', 'Low']
            }
          },
          required: ['row_index', 'title', 'description', 'severity'],
          propertyOrdering: ['row_index', 'title', 'description', 'severity']
        }
      };
    }

    const response = await aiClient.models.generateContent({
      model: model,
      contents: contents,
      config: generationConfig,
    });

    const text = response.text || ""; // Default to empty string if no text

    // Conditionally parse JSON based on requestType and if JSON format was enforced
    if (requestType === 'audit-findings' && generationConfig.responseMimeType === "application/json") {
      try {
        const jsonResponse = JSON.parse(text);
        return res.status(200).json({ response: jsonResponse, requestType });
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON for audit-findings (mock data):", text, parseError);
        return res.status(500).json({ error: 'AI 모델이 유효한 JSON을 반환하지 않았습니다.', rawText: text, requestType });
      }
    } else {
      // For other request types or when not forcing JSON, return raw text/markdown
      return res.status(200).json({ response: text, requestType });
    }

  } catch (error) {
    console.error("Gemini API Error from serverless function:", error);
    return res.status(500).json({ error: 'AI 모델로부터 응답을 가져오는 데 실패했습니다.', requestType });
  }
}
