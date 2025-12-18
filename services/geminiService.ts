
import { AUDIT_AREAS, CRITICAL_VIOLATIONS } from "../data/mockData";

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const context = `
      # Forensic Auditor Core Instructions
      - You are an expert AI Forensic Auditor designed to detect fraud and internal control failures.
      - Data Processing: Input is provided in a high-density Pipe(|) separated format to optimize token usage.
      - Detection Targets:
        1. Conflict of Interest: Match Employee Account Numbers vs Vendor Master Accounts.
        2. Disbursement Fraud: Identify duplicate payments (same date/amt/vendor).
        3. Ghost Vendors: Detect high-value payments to unverified or new vendors during non-business hours.
      - Constraint: Analyze the context even if data appears truncated. Return findings in a structured JSON report including 'risk_score', 'summary', and 'findings' list.

      위 지침에 따라 "Nexus Corp (넥서스 주식회사)"의 감사 데이터를 분석하고 답변은 항상 한국어로 전문적이고 명확하게 작성하십시오.
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