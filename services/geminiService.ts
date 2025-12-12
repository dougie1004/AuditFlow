import { GoogleGenAI } from "@google/genai";
import { AUDIT_AREAS, CRITICAL_VIOLATIONS, MOCK_SCENARIOS } from "../data/mockData";

let aiClient: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!aiClient) {
    return "AuditFlow AI가 연결되지 않았습니다. API_KEY를 확인해주세요.";
  }

  try {
    const context = `
      당신은 내부 감사 및 컴플라이언스 전문가 AI 'AuditFlow'입니다.
      가상의 기업 "Nexus Corp (넥서스 주식회사)"의 감사 데이터를 분석하고 있습니다.
      
      현재 감사 현황:
      - 전체 감사 영역: 9개 (${AUDIT_AREAS.map(a => a.name).join(', ')})
      - 실행된 시나리오: 90개
      - 발견된 주요 위반: ${CRITICAL_VIOLATIONS.length}건
      
      주요 위반 사항 데이터:
      ${CRITICAL_VIOLATIONS.map(v => `- [${v.areaCode}] ${v.violationType}: ${v.aiAnalysis}`).join('\n')}

      당신의 역할은 이 위반 사항들을 설명하거나, 추가적인 감사 절차를 제안하고, 이해관계자에게 보낼 이메일 초안을 작성하는 것입니다.
      답변은 한국어로, 전문적이고 명확하며 리스크 완화에 초점을 맞춰 작성하십시오.
    `;

    const model = 'gemini-2.5-flash';
    
    const response = await aiClient.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: context,
      }
    });

    return response.text || "데이터를 처리했으나 응답을 생성할 수 없습니다.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "감사 데이터를 분석하는 중 오류가 발생했습니다. 다시 시도해 주세요.";
  }
};