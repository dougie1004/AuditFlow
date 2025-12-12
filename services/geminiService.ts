import { AUDIT_AREAS, CRITICAL_VIOLATIONS } from "../data/mockData";

export const sendMessageToGemini = async (message: string): Promise<string> => {
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

    // Call our own backend API route instead of Gemini API directly
    const apiResponse = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, context }),
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({})); // Gracefully handle non-json responses
        throw new Error(errorData.error || `서버 오류: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data.response;

  } catch (error) {
    console.error("API call error:", error);
    return "AuditFlow AI에 연결하는 중 오류가 발생했습니다. Vercel 프로젝트에 `API_KEY` 환경 변수가 올바르게 설정되었는지 확인해주세요.";
  }
};
