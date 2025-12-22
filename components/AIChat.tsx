
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, User, Bot, Sparkles, RefreshCw, ShieldCheck, Siren, FilePlus2, AlertTriangle, Database } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage, Scenario, ViolationDetail, AuditAreaCode, MockUploadFile } from '../types';
import { AUDIT_AREAS, MOCK_CORP_CARD_TRANSACTIONS, MOCK_FORECAST_DATA, CRITICAL_VIOLATIONS } from '../data/mockData';
import { MOCK_DOCUMENTS } from '../data/documents';

interface AIChatProps {
  onAddScenario: (scenario: Scenario) => void;
  onAddScenarioAndViolation: (scenario: Scenario, violation: ViolationDetail) => void;
  uploadedFiles: MockUploadFile[];
}

// Type for the AI's structured findings
interface AiFinding {
  row_index: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
}

// Helper to simulate dynamic audit findings based on uploaded files and user input
const generateDynamicAuditFindings = (
  userText: string,
  uploadedFiles: MockUploadFile[],
  fullViolationsPool: ViolationDetail[]
): AiFinding[] => {
  const lowerCaseUserText = userText.toLowerCase();
  const relevantFindings: AiFinding[] = [];
  const selectedViolationIds = new Set<string>(); // To prevent duplicate base findings

  // Prioritize findings based on keywords in user input
  const keywordsToFilter = (keyword: string) => lowerCaseUserText.includes(keyword);

  // Pool of violation IDs that are good candidates for dynamic findings
  // Prioritize 'AI' suffix or specific V01 which are designed to be dynamic
  const dynamicCandidateViolations = fullViolationsPool.filter(v => v.id.includes('-AI') || v.id.includes('-V01'));

  // Filter based on user keywords
  const specificKeywordFindings = dynamicCandidateViolations.filter(v => {
    if (keywordsToFilter('쪼개기 결제') && v.violationType.includes('쪼개기 결제')) return true;
    if (keywordsToFilter('유흥업소') && v.violationType.includes('유흥업소')) return true;
    if (keywordsToFilter('가공 거래처') && v.violationType.includes('가공 거래처')) return true;
    if (keywordsToFilter('심야 시간') && v.violationType.includes('심야시간')) return true;
    if (keywordsToFilter('자택 인근') && v.violationType.includes('자택 인근')) return true;
    if (keywordsToFilter('비표준 분개') && v.violationType.includes('비표준 분개')) return true;
    if (keywordsToFilter('데이터 유출') && v.violationType.includes('데이터 외부 반출')) return true;
    if (keywordsToFilter('중복 청구') && v.violationType.includes('중복 청구')) return true;
    if (keywordsToFilter('과도한 의존') && v.violationType.includes('과도한 의존')) return true;
    if (keywordsToFilter('퇴직자') && v.violationType.includes('퇴직자 계정')) return true;
    if (keywordsToFilter('계정 잔액') && v.violationType.includes('계정 잔액 이상')) return true;
    if (keywordsToFilter('클라우드') && v.violationType.includes('클라우드 스토리지')) return true;
    if (keywordsToFilter('매출채권') && v.violationType.includes('매출채권 회수 지연')) return true;
    if (keywordsToFilter('주유비') && v.violationType.includes('주유비 과다 사용')) return true;
    if (keywordsToFilter('사적 사용') && v.violationType.includes('사적 사용 의심')) return true; // New keyword for EXP-V07-AI
    return false;
  });

  // Add specific keyword findings first
  specificKeywordFindings.forEach(v => {
    if (!selectedViolationIds.has(v.id)) {
      relevantFindings.push({
        row_index: `R${Math.floor(Math.random() * 500) + 1}`, // Simulate row from uploaded data
        title: v.violationType,
        description: v.aiAnalysis,
        severity: v.riskLevel,
      });
      selectedViolationIds.add(v.id);
    }
  });

  // If few or no specific findings, add some general ones to fill up
  let generalFindingsCount = Math.max(0, 3 - relevantFindings.length); // Aim for at least 3 findings
  const shuffledCandidates = [...dynamicCandidateViolations].sort(() => 0.5 - Math.random());
  
  for (const v of shuffledCandidates) {
    if (generalFindingsCount <= 0) break;
    if (!selectedViolationIds.has(v.id)) {
      relevantFindings.push({
        row_index: `R${Math.floor(Math.random() * 500) + 1}`,
        title: v.violationType,
        description: v.aiAnalysis,
        severity: v.riskLevel,
      });
      selectedViolationIds.add(v.id);
      generalFindingsCount--;
    }
  }

  // Ensure unique findings (final check) and limit to a reasonable number
  return relevantFindings.slice(0, 5); // Max 5 findings for brevity
};


const AIChat: React.FC<AIChatProps> = ({ onAddScenario, onAddScenarioAndViolation, uploadedFiles }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: '### 👋 안녕하세요, AuditFlow AI입니다.\n\n기업의 **회계 데이터, 계약서, 거래 내역 간의 불일치**를 정밀 분석하여 잠재적 위험을 식별해 드립니다.\n\n*   **"법인카드 분석"**, **"포렌식 감사"**: 업로드된 **거래 데이터(CSV/TXT)**를 분석하여 이상 징후를 찾습니다. (BigQuery ML 시뮬레이션)\n*   **"계약서 분석"**, **"정책 검토"**: 업로드된 **문서(PDF/TXT)**의 핵심을 요약합니다. (Document AI 시뮬레이션)\n*   **"SQL 생성"**, **"재고 예측"**: Gemini의 고급 추론 능력을 활용합니다.\n*   **"자가 학습"**, **"MLOps"**: 시스템의 자가 학습 원리를 설명합니다.\n\n무엇을 도와드릴까요?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loadingMessageRef = useRef<HTMLSpanElement>(null); // Ref for dynamic loading message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMessage: ChatMessage = { role: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let geminiSystemInstruction = `당신은 최고 수준의 기업 내부감사 및 데이터 사이언티스트입니다. 당신의 임무는 제공된 정보를 분석하여 요청에 답변하는 것입니다.`;
    let geminiContents: any[] = [{ text: userText }];
    let requestType: string = 'general-chat';
    let dynamicFindings: AiFinding[] = []; // To store findings generated client-side
    let currentLoadingMessage = '데이터셋 심층 분석 중...'; // Default loading message

    let relevantUploadedFiles: MockUploadFile[] = [];
    let hasRelevantUploadedFiles: boolean = false; // Flag for API to determine JSON vs text output

    const lowerCaseInput = userText.toLowerCase();

    // --- 1. Audit Findings (Structured JSON Output via Client-side + Gemini Natural Language) ---
    const auditKeywords = ['법인카드', '경비', '지출', '회계', '포렌식 감사', '부정 징후', '감사 분석', '위반 패턴', '거래처', '쪼개기 결제', '유흥업소', '가공 거래처', '심야 시간', '자택 인근', '중복 청구', '과도한 의존', '퇴직자', '계정 잔액', '클라우드 보안', '매출채권', '사적 사용'];
    if (auditKeywords.some(keyword => lowerCaseInput.includes(keyword))) {
        requestType = 'audit-findings';
        currentLoadingMessage = '거래 데이터 및 로그 분석 중...';

        relevantUploadedFiles = uploadedFiles.filter(f => 
            (f.type === 'CSV' || f.type === 'Excel' || f.type === 'LOG') && f.content && 
            (f.name.toLowerCase().includes('transaction') || f.name.toLowerCase().includes('card') || f.name.toLowerCase().includes('account') || f.name.toLowerCase().includes('vendor') || f.name.toLowerCase().includes('expense') || f.name.toLowerCase().includes('journal') || f.name.toLowerCase().includes('invoice') || f.name.toLowerCase().includes('log'))
        );

        if (relevantUploadedFiles.length > 0) {
            hasRelevantUploadedFiles = true;
            // Strategy: Gemini summarizes/acknowledges uploaded data (natural language), client-side generates structured findings
            geminiSystemInstruction = `
              당신은 최고 수준의 기업 내부감사 및 데이터 사이언티스트입니다.
              사용자의 질문과 함께 제공되는 업로드된 데이터를 분석한 후, 해당 데이터에서 발견될 수 있는 잠재적인 감사 패턴이나 이상 징후에 대한 간략한 요약을 제공하십시오.
              업로드된 데이터는 CSV, 텍스트 로그, 또는 비정형 문서의 텍스트 추출 내용입니다.
              데이터의 형식이나 내용에 따라 적절한 분석 인사이트를 Markdown 형식으로 제공하고, 특정 수치나 패턴을 언급하여 전문성을 보여주십시오.
              업로드된 파일 목록은 다음과 같습니다: ${relevantUploadedFiles.map(f => f.name).join(', ')}.
              요약 후, 추가 질문이 있다면 제시해주십시오.
            `;
            geminiContents.push({ text: "\n\n--- 업로드된 데이터 ---\n" });
            relevantUploadedFiles.forEach(file => {
                geminiContents.push({ text: `\n--- 파일명: ${file.name} (유형: ${file.type}, 크기: ${file.size}) ---\n` });
                geminiContents.push({ text: file.content || '' }); // Pass actual content
            });
            geminiContents.push({ text: "\n--- 데이터 끝 ---\n" });

            // Generate dynamic findings client-side from the expanded pool
            dynamicFindings = generateDynamicAuditFindings(userText, uploadedFiles, CRITICAL_VIOLATIONS);

        } else {
            // Fallback to mock data and instruct Gemini to analyze that JSON
            geminiSystemInstruction = `
              당신은 최고 수준의 기업 내부감사 및 데이터 사이언티스트입니다. 
              당신의 임무는 제공된 JSON 형식의 법인카드 거래 데이터를 분석하여 실제 부정 및 오류 패턴을 찾아내는 것입니다.

              [분석 가이드라인]
              1. 단순 텍스트 매칭이 아닌 '패턴'에 집중하십시오. 
                 - 쪼개기 결제: 승인 한도(예: 100만원) 직전 금액으로 동일 날짜/거래처 반복 결제.
                 - 비정상 시점: 감사 대상의 자택 인근에서 발생한 심야/주말 지출과 적요 내용의 불일치.
                 - 관계인 거래: 평범한 상호명을 가졌으나 특정 기간에 비정상적으로 집중된 고액 자문료.
                 - 사적 사용 의심: 온라인 쇼핑몰, 개인 여가 관련 업종에서 업무 연관성 없이 발생한 결제.
              2. 모든 탐지 결과에는 반드시 원본 데이터의 'id' 또는 'employee.id'를 row_index로 포함해야 합니다.

              [출력 형식]
              반드시 아래 JSON 형식의 배열로만 응답하십시오. (부연 설명 제외)
              [{
                "row_index": "숫자 (거래 ID)",
                "title": "이슈 제목",
                "description": "이상 징후 근거 데이터 요약 및 분석 의견",
                "severity": "High | Medium | Low"
              }]
            `;
            geminiContents.push({ text: "\n\n--- 감사 대상 법인카드 거래 데이터 (JSON 형식 - Fallback Mock Data) ---\n" });
            geminiContents.push({ text: JSON.stringify(MOCK_CORP_CARD_TRANSACTIONS, null, 2) });
            geminiContents.push({ text: "\n--- 데이터 끝 ---\n" });
            setMessages(prev => [...prev, {
                role: 'model',
                text: `**[AuditFlow 시스템 알림]** 현재 업로드된 파일 중 감사 분석에 활용할 수 있는 관련 데이터(CSV/Excel/로그 파일)를 찾을 수 없습니다. 법인카드 Mock 데이터를 사용하여 분석을 시뮬레이션합니다. 실제 업로드된 파일을 분석하려면, 관련 거래/계정 데이터를 포함하는 CSV 또는 Excel 파일을 업로드해주세요.`,
                timestamp: new Date(),
            }]);
        }
    } 
    // --- 2. Document Analysis (Document AI Simulation) ---
    else if (lowerCaseInput.includes('계약서 분석') || lowerCaseInput.includes('문서 내용') || lowerCaseInput.includes('정책 검토') || lowerCaseInput.includes('pdf 분석')) {
        requestType = 'document-analysis';
        currentLoadingMessage = '비정형 문서 내용 분석 중...';

        const relevantDocs = uploadedFiles.filter(f => f.type === 'PDF' && f.content && (f.name.toLowerCase().includes('policy') || f.name.toLowerCase().includes('agreement') || f.name.toLowerCase().includes('contract') || f.name.toLowerCase().includes('규정') || f.name.toLowerCase().includes('계약서')));
        if (relevantDocs.length > 0) {
            hasRelevantUploadedFiles = true;
            geminiSystemInstruction = `
              당신은 Google Document AI 및 Cloud Natural Language 전문가입니다. 
              제공된 문서 내용을 분석하여 사용자의 질문에 답하거나 핵심 내용을 요약하고, 
              문서에서 중요한 조항, 키워드, 그리고 잠재적인 위반 가능성을 언급하십시오. 
              응답은 Markdown 형식으로 상세하게 제공하십시오.
              업로드된 문서 목록은 다음과 같습니다: ${relevantDocs.map(f => f.name).join(', ')}.
            `;
            geminiContents.push({ text: "\n\n--- 분석 대상 업로드된 문서 내용 ---\n" });
            relevantDocs.forEach(file => {
                geminiContents.push({ text: `\n--- 파일명: ${file.name} (유형: ${file.type}, 크기: ${file.size}) ---\n` });
                geminiContents.push({ text: file.content || '' }); // Pass actual content
            });
            geminiContents.push({ text: "\n--- 문서 내용 끝 ---\n" });
        } else {
            geminiSystemInstruction = `
              당신은 Google Document AI 및 Cloud Natural Language 전문가입니다. 
              제공된 문서 내용을 분석하여 사용자의 질문에 답하거나 핵심 내용을 요약하고, 
              문서에서 중요한 조항, 키워드, 그리고 잠재적인 위반 가능성을 언급하십시오. 
              응답은 Markdown 형식으로 상세하게 제공하십시오.
            `;
            geminiContents.push({ text: "\n\n--- 분석 대상 문서 내용 (Fallback Mock Data) ---\n" });
            geminiContents.push({ text: MOCK_DOCUMENTS[0].content });
            geminiContents.push({ text: "\n--- 문서 내용 끝 ---\n" });
            setMessages(prev => [...prev, {
                role: 'model',
                text: `**[AuditFlow 시스템 알림]** 업로드된 파일 중 관련 문서를 찾을 수 없어, Mock 문서 데이터를 사용하여 분석을 시뮬레이션합니다. 실제 업로드된 문서를 분석하려면, 관련 PDF 파일을 업로드해주세요.`,
                timestamp: new Date(),
            }]);
        }
    }
    // --- 3. SQL Generation (Gemini Generative AI Simulation) ---
    else if (lowerCaseInput.includes('sql 생성') || lowerCaseInput.includes('쿼리 만들어줘') || lowerCaseInput.includes('데이터베이스 조회') || lowerCaseInput.includes('bigquery')) {
        geminiSystemInstruction = `당신은 BigQuery SQL 전문가입니다. 사용자의 요청을 바탕으로 가상의 'transactions' 및 'vendors' 테이블에서 데이터를 조회하는 SQL 쿼리를 생성하십시오. 결과를 Markdown 코드 블록으로 제시하십시오. 설명 없이 SQL 코드 블록만 반환하거나, 짧은 설명 후 SQL 코드 블록을 제공하세요.`;
        currentLoadingMessage = 'SQL 쿼리 생성 중...';
        requestType = 'sql-generation';
        geminiContents.push({ text: `가상의 'transactions' 테이블 스키마: \n\`\`\`sql\nTransactionID STRING, EmployeeID STRING, Date STRING, Merchant STRING, Category STRING, Amount INTEGER, Description STRING, AnomalyFlag STRING\n\`\`\`\n가상의 'vendors' 테이블 스키마:\n\`\`\`sql\nVendorID STRING, Name STRING, TaxID STRING, Address STRING, BankAccount STRING, RegistrationDate STRING\n\`\`\`\n이 스키마를 활용하여 "${userText}"에 대한 SQL 쿼리를 작성해 주세요. 불필요한 설명 없이 SQL 코드 블록만 반환하거나, 짧은 설명 후 SQL 코드 블록을 제공하세요.` });
    }
    // --- 4. Checklist Generation (Gemini Generative AI Simulation) ---
    else if (lowerCaseInput.includes('체크리스트 생성') || lowerCaseInput.includes('감사 포인트') || lowerCaseInput.includes('점검 목록')) {
        geminiSystemInstruction = `당신은 감사 전문가입니다. 사용자가 요청한 주제에 대한 상세한 감사 체크리스트 또는 주요 감사 포인트를 Markdown 형식으로 생성하십시오. 각 항목은 명확하고 실용적이며, 실제 감사에서 바로 활용할 수 있도록 구체적인 예를 포함하는 것이 좋습니다.`;
        currentLoadingMessage = '감사 체크리스트 생성 중...';
        requestType = 'checklist-generation';
    }
    // --- 5. Inventory Analysis / Production Forecast (BigQuery ML / AutoML Tabular Simulation) ---
    else if (lowerCaseInput.includes('재고 예측') || lowerCaseInput.includes('생산 계획') || lowerCaseInput.includes('수요 분석')) {
        geminiSystemInstruction = `당신은 생산 및 재고 관리 전문가입니다. 제공된 재고 및 수요 데이터를 분석하여 사용자의 질문에 답하고, 잠재적인 재고 부족 또는 생산 계획 개선 사항을 제시하십시오. 데이터를 기반으로 명확하고 간결하게 설명하십시오.`;
        currentLoadingMessage = '재고 및 수요 예측 분석 중...';
        geminiContents.push({ text: "\n\n--- 재고 및 수요 예측 데이터 (JSON 형식) ---\n" });
        geminiContents.push({ text: JSON.stringify(MOCK_FORECAST_DATA, null, 2) });
        geminiContents.push({ text: "\n--- 데이터 끝 ---\n" });
        requestType = 'inventory-analysis';
    }
    // --- 6. Self-Learning Loop / MLOps (Vertex AI Pipelines Simulation) ---
    else if (lowerCaseInput.includes('자가 학습') || lowerCaseInput.includes('mlops') || lowerCaseInput.includes('모델 개선')) {
        geminiSystemInstruction = `당신은 MLOps 및 AI 모델 학습 전문가입니다. AuditFlow AI가 어떻게 감사인의 피드백을 통해 자가 학습하고 모델 성능을 개선하는지 상세히 설명하십시오. Vertex AI Pipelines 개념을 포함하여 기술적 관점에서 상세하게 설명해 주십시오.`;
        currentLoadingMessage = 'MLOps 학습 원리 설명 생성 중...';
        requestType = 'self-learning-explanation';
    }
    // --- 7. Security Logs Analysis (for Latest_Server_Security_Logs.log) ---
    else if (lowerCaseInput.includes('보안 로그') || lowerCaseInput.includes('접근 시도') || lowerCaseInput.includes('해킹') || lowerCaseInput.includes('이상 접속')) {
      requestType = 'security-analysis';
      currentLoadingMessage = '보안 로그 분석 중...';

      const relevantLogFile = uploadedFiles.find(f => f.name.toLowerCase().includes('security_logs.log') || f.name.toLowerCase().includes('server_security_logs.log'));
      if (relevantLogFile) {
        hasRelevantUploadedFiles = true;
        geminiSystemInstruction = `
          당신은 사이버 보안 전문가이자 AI 로그 분석 전문가입니다.
          제공된 서버 보안 로그 데이터를 분석하여 사용자의 질문에 답하거나,
          잠재적인 보안 위협, 비정상적인 접근 패턴, 또는 시스템 이상 징후를 상세하게 보고하십시오.
          응답은 Markdown 형식으로 제공하고, 구체적인 로그 라인이나 타임스탬프를 예시로 들어 설명하십시오.
          분석 대상 로그 파일: ${relevantLogFile.name} (유형: ${relevantLogFile.type}, 크기: ${relevantLogFile.size}).
        `;
        geminiContents.push({ text: "\n\n--- 분석 대상 서버 보안 로그 ---\n" });
        geminiContents.push({ text: relevantLogFile.content || '' });
        geminiContents.push({ text: "\n--- 로그 끝 ---\n" });
      } else {
        // Fallback for security analysis if no specific log file uploaded
        geminiSystemInstruction = `
          당신은 사이버 보안 전문가입니다. 사용자의 질문을 바탕으로 일반적인 서버 보안 로그 분석에서 발견될 수 있는
          주요 위협과 패턴을 설명하십시오. 가상 시나리오를 예시로 들어 상세하게 답변해주세요.
        `;
        setMessages(prev => [...prev, {
            role: 'model',
            text: `**[AuditFlow 시스템 알림]** 관련 보안 로그 파일이 업로드되지 않아, 일반적인 보안 위협 분석에 대해 답변합니다. 실제 로그 파일을 업로드하면 더 정확한 분석이 가능합니다.`,
            timestamp: new Date(),
        }]);
      }
    }
    
    // Update loading message immediately
    if (loadingMessageRef.current) {
        loadingMessageRef.current.textContent = currentLoadingMessage;
    }

    try {
      const { response, requestType: actualRequestType } = await sendMessageToGemini(geminiContents, geminiSystemInstruction, requestType, hasRelevantUploadedFiles);

      if (actualRequestType === 'audit-findings') {
        let finalResponseText = '';
        let findingsToDisplay: AiFinding[] = [];

        if (hasRelevantUploadedFiles) { // If uploaded files were passed to Gemini
            finalResponseText = response.trim(); // Gemini provided a natural language summary
            findingsToDisplay = dynamicFindings; // Use client-side generated structured findings
        } else { // If mock data was used (fallback)
            if (Array.isArray(response)) {
                findingsToDisplay = response;
                finalResponseText = `법인카드 Mock 데이터를 기반으로 ${findingsToDisplay.length}건의 주요 감사 발견 사항을 식별했습니다.`;
            } else {
                finalResponseText = response || `제공된 데이터에서 특별한 이상 징후를 발견하지 못했습니다.`;
            }
        }
        
        // Add Gemini's natural language response first (preamble)
        setMessages(prev => [...prev, {
            role: 'model',
            text: finalResponseText,
            timestamp: new Date(),
            isJson: false, // This is a natural language preamble
        }]);

        // Then add the structured findings
        if (findingsToDisplay.length > 0) {
            setMessages(prev => [...prev, {
                role: 'model',
                text: JSON.stringify(findingsToDisplay),
                timestamp: new Date(),
                isJson: true // This is the structured JSON part
            }]);

            findingsToDisplay.forEach((finding, index) => {
                const areaCode: AuditAreaCode = 'EXP'; // Default for AI findings, can be refined
                const timestamp = new Date().toISOString();
                // Ensure unique IDs even if findings come from client-side or Gemini
                const baseId = `AI-${areaCode}-${finding.row_index.replace(/\s/g, '')}-${index}`;
                const dynamicSuffix = `-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                const newScenario: Scenario = {
                    id: `${baseId}${dynamicSuffix}`,
                    areaCode: areaCode,
                    title: finding.title,
                    status: finding.severity === 'Low' ? 'Pass' : 'Fail',
                    description: finding.description.split('.')[0] + '.',
                    detailedDescription: `**관련 행 번호:** ${finding.row_index}\n\n${finding.description}`,
                    timestamp: timestamp,
                    type: 'Structured',
                    evidenceUrl: '',
                    isNew: true,
                    risk: finding.severity,
                    violationId: `V-${baseId}${dynamicSuffix}`
                };

                const newViolation: ViolationDetail = {
                    id: `V-${baseId}${dynamicSuffix}`,
                    areaCode: areaCode,
                    riskLevel: finding.severity,
                    controlPoint: 'AI Forensic Audit',
                    violationType: finding.title,
                    transactionInfo: {
                        id: finding.row_index,
                        amount: 'N/A', // Amount might not be directly available for dynamic findings
                        date: timestamp.split('T')[0],
                        entity: 'AI Detected Anomaly'
                    },
                    aiAnalysis: finding.description,
                    recommendation: `AI 분석 기반으로 정밀 조사 필요. 관련 데이터 행 번호: ${finding.row_index}`,
                    evidenceType: 'Log File'
                };

                onAddScenarioAndViolation(newScenario, newViolation);
                
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'model',
                        text: `**[AuditFlow 시스템 알림]** 새로운 부정 행위 패턴(${newScenario.id})을 감지하여 '시나리오 관리' 및 '감사 보고서'에 신규 위반 사항을 자동 등록했습니다.`,
                        timestamp: new Date(),
                    }
                ]);
            });
        } else {
            setMessages(prev => [...prev, {
                role: 'model',
                text: '**[AuditFlow 시스템 알림]** 업로드된 데이터에서 AI가 식별할 만한 특정 위반 패턴을 찾지 못했습니다. 다른 질문을 시도해보거나 더 다양한 데이터를 업로드해보세요.',
                timestamp: new Date(),
            }]);
        }
      } else {
        // For other request types (document-analysis, sql-generation, etc.), display raw text/markdown response
        const botMessage: ChatMessage = { role: 'model', text: response || "AI 서비스 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", timestamp: new Date(), isJson: false };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("API call error in AIChat:", error);
      setMessages(prev => [...prev, { role: 'model', text: "AI 서비스 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (상세: " + error + ")", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const MessageContent: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const { text, role, isJson } = msg;

    if (role === 'user') return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;

    if (isJson) {
      try {
        const findings: AiFinding[] = JSON.parse(text);
        if (!Array.isArray(findings) || findings.length === 0) {
            return <p className="leading-relaxed text-slate-700">AI 분석 결과, 특이사항이 발견되지 않았습니다.</p>;
        }

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Siren className="w-5 h-5 text-blue-600" /> AuditFlow AI Findings
            </h3>
            {findings.map((finding, idx) => (
              <div key={idx} className={`p-4 rounded-xl border shadow-sm ${
                finding.severity === 'High' ? 'bg-red-50 border-red-200' :
                finding.severity === 'Medium' ? 'bg-orange-50 border-orange-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">Row: {finding.row_index}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    finding.severity === 'High' ? 'bg-red-100 text-red-700' :
                    finding.severity === 'Medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {finding.severity}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1">{finding.title}</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{finding.description}</p>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Database className="w-3 h-3"/> AI 데이터 분석 기반
                </p>
              </div>
            ))}
          </div>
        );
      } catch (e) {
        console.error("Error parsing JSON message:", e);
        return <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">{text}</p>;
      }
    }
    
    const renderMarkdown = (markdownText: string) => {
      const parts = markdownText.split(/(```[\s\S]*?```)/g);
      return parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language if specified (e.g., ```sql)
          const codeBlockContent = part.substring(3, part.length - 3).trim();
          const firstLineBreak = codeBlockContent.indexOf('\n');
          const language = firstLineBreak !== -1 ? codeBlockContent.substring(0, firstLineBreak).trim() : '';
          const codeContent = firstLineBreak !== -1 ? codeBlockContent.substring(firstLineBreak + 1) : codeBlockContent;

          return (
            <pre key={i} className="bg-slate-800 text-slate-100 p-3 rounded-md text-xs overflow-x-auto my-2">
              {language && <div className="text-slate-500 text-[10px] mb-1">{language.toUpperCase()}</div>}
              <code>{codeContent}</code>
            </pre>
          );
        } else {
          const lines = part.split('\n');
          return lines.map((line, j) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={`${i}-${j}`} className="h-3" />;

            const parseBold = (lineContent: string) => {
                const boldParts = lineContent.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((boldPart, k) => {
                    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                        return <strong key={k} className="font-bold text-slate-900 bg-yellow-50/50 px-0.5 rounded">{boldPart.slice(2, -2)}</strong>;
                    }
                    return boldPart;
                });
            };

            if (trimmed.startsWith('**[AuditFlow 시스템 알림]**') || trimmed.startsWith('**[System]**')) {
               return (
                 <div key={`${i}-${j}`} className={`text-xs font-mono flex items-center gap-2 p-2 rounded mb-1 text-green-800 bg-green-50 border border-green-200 shadow-sm mt-2`}>
                    <FilePlus2 className="w-4 h-4" />
                    {parseBold(trimmed.replace(/\*\*\[.*?\]\*\*/, '').trim())}
                 </div>
               );
            }
            if (trimmed.startsWith('###')) {
               return <h3 key={`${i}-${j}`} className="text-lg font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2">
                  <Siren className="w-5 h-5 text-blue-600" />
                  {parseBold(trimmed.replace(/^#+\s*/, ''))}
               </h3>;
            }
            if (/^\d+\.\s/.test(trimmed)) {
               return (
                 <div key={`${i}-${j}`} className="flex items-start gap-3 ml-1 mt-2">
                   <span className="font-bold text-slate-600 min-w-[1.2rem]">{trimmed.match(/^\d+\./)?.[0]}</span>
                   <div className="leading-relaxed text-slate-800">{parseBold(trimmed.replace(/^\d+\.\s/, ''))}</div>
                 </div>
               );
            }
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
               const content = trimmed.replace(/^[\*\-]\s*/, '');
               return (
                 <div key={`${i}-${j}`} className="flex items-start gap-3 ml-4">
                   <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                   <div className="leading-relaxed text-slate-700">{parseBold(content)}</div>
                 </div>
               );
            }
            return <div key={`${i}-${j}`} className="leading-relaxed text-slate-700">{parseBold(trimmed)}</div>;
          });
        }
      });
    };

    return (
      <div className="space-y-1 text-[15px]">
        {renderMarkdown(text)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight">AuditFlow AI Assistant</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <p className="text-slate-400 text-xs font-medium">System Online</p>
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([messages[0]])} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full" title="대화 초기화">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-100 border border-blue-200' : 'bg-white border border-slate-200'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-blue-600" /> : <Bot className="w-5 h-5 text-indigo-600" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                <MessageContent msg={msg} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 ml-14">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span ref={loadingMessageRef} className="text-slate-400 text-xs font-medium animate-pulse">데이터셋 심층 분석 중...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="가공 거래처 분석, 부정 징후 탐지 등 원하는 작업을 입력하세요..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
                disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center mt-3 gap-6">
             <span className="text-[11px] text-slate-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 내부 데이터 보호 중</span>
             <span className="text-[11px] text-slate-400">AI는 실수를 할 수 있습니다. 반드시 증빙을 확인하세요.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
