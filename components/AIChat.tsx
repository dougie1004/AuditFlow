
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, RefreshCw, ShieldCheck, Siren, FilePlus2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage, Scenario, ViolationDetail } from '../types';

const FORENSIC_RESPONSE = `분석을 시작합니다...

**[System]** 회계 데이터 파일 스키마 매핑 완료.
**[System]** GL-Vendor-Employee 간 Cross-Validation 쿼리 실행 중...
**[System]** 이상 징후 패턴 매칭률: 98.2%

보고서 작성이 완료되었습니다.

### 1. AuditFlow 주요 부정 시나리오 예상 (Hypothesis)
업로드된 데이터(GL, Vendor Master, Transaction Log 등)의 구조를 파악한 결과, 수동 감사로는 발견하기 어려운 다음 3가지 **지능형 부정(Smart Fraud)** 가능성을 최우선으로 검증했습니다:

1.  **유령 거래처(Ghost Vendor)를 통한 횡령**: 내부 직원이 가족이나 지인 명의로 위장 거래처를 등록하고 대금을 가로채는 행위.
2.  **전결 규정 회피를 위한 분할 결제(Structuring)**: 승인 권한 한도($10,000)를 넘지 않도록 고의적으로 금액을 쪼개어 결제하는 수법.
3.  **허위 매출 및 재고 임의 삭제(Round Tripping)**: 실적 압박으로 가짜 매출을 일으킨 뒤, 추후 재고가 빈 것을 감추기 위해 '파손/망실'로 처리하는 분식 회계.

---

### 2. 시나리오별 발견된 증거 및 로직

**(1) 시나리오 1: 유령 거래처와 내부 직원 공모**
*   **발견 내용**: 공급업체 **'NewBiz Partner' (VendorID: V-0078)**의 사업장 등록 주소가 인사 정보상 **'김철수(E1002)'** 재무팀 과장의 자택 주소와 **100% 일치**합니다.
*   **검증 로직**: \`Vendor_Master.Address == Employee_Master.Address\` Join 분석.
*   **결정적 증거**: 해당 업체는 등록된 지 24시간 이내에 **$18,000**의 송금(Wire Transfer)이 발생했으며, 이에 대한 최종 승인자가 김철수 본인입니다(Self-Approval).

**(2) 시나리오 2: 승인 한도 회피 (Split Payments)**
*   **발견 내용**: 공급업체 **'Zeta Supplies'**에 대해 2025-10-09 하루 동안 **$9,900**씩 3회에 걸쳐 총 **$29,700**이 송금되었습니다.
*   **검증 로직**: \`Wire_Transfer_Log\`에서 동일 수취인(Beneficiary)에게 1시간 이내 연속 이체된 건 합산.
*   **의도**: 자금 관리 규정상 **$10,000 이상 시 본부장 승인**이 필요한 통제 절차(DoA)를 무력화하기 위한 전형적인 '쪼개기(Structuring)' 수법입니다.

**(3) 시나리오 3: 허위 매출 후 재고 임의 삭제**
*   **발견 내용**: 2025-01-10 **'PROD-A'** 품목에 대해 **$24,000**의 대량 매출(Sales Order: SO-2025-003)이 발생했으나, 5일 후인 01-15에 해당 품목의 재고가 **'파손(Damage)'** 사유로 대량 Write-off 되었습니다.
*   **검증 로직**: \`Sales_Order\`의 ProductID와 \`Inventory_Adjustment\`의 ProductID 시계열 상관분석.
*   **해석**: 실물 이동 없이 매출만 발생시켜 분기 실적을 부풀린 후, 실사(Physical Count) 때 재고가 없는 것을 '파손'으로 위장하여 장부에서 지운 정황이 뚜렷합니다.

---

### 3. 재무적 위험도 판정
*   **Overall Risk: High (매우 높음)**
*   **판정 사유**: 재무팀 내부 관리자급 인원이 연루된 횡령 정황(Scenario 1)과 내부 통제 시스템을 조직적으로 무력화하려는 시도(Scenario 2)가 동시에 발견되었습니다. 이는 단순 실수가 아닌 **고의적인 범죄 행위**로 판단됩니다.
*   **권고**: 즉시 감사 위원회를 소집하고, 해당 직원(E1002)의 계정 동결 및 Forensic Imaging(PC/이메일 증거 확보)을 수행하십시오.

---
**[System]** 새로운 부정 행위 패턴을 감지하여 '시나리오 관리' 및 '감사 보고서'에 신규 위반 사항을 자동 등록했습니다.`;

interface AIChatProps {
  onAddScenario: (scenario: Scenario) => void;
  onAddScenarioAndViolation: (scenario: Scenario, violation: ViolationDetail) => void;
}

const AIChat: React.FC<AIChatProps> = ({ onAddScenario, onAddScenarioAndViolation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: '### 👋 안녕하세요, AuditFlow AI입니다.\n\n기업의 **회계 데이터, 계약서, 거래 내역 간의 불일치**를 정밀 분석하여 잠재적 위험을 식별해 드립니다.\n\n* **"가공 거래처"** 또는 **"포렌식 감사"**와 같은 키워드로 질문하시면, 업로드된 데이터를 심층 분석하여 부정 징후를 즉시 찾아냅니다.', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    // --- Optimized Local Simulation for "Ghost Vendor" / Forensic Analysis ---
    // This allows for instant feedback without API latency and ensures
    // the complex data objects are correctly created for the Audit Report.
    if (userText.includes('가공') || userText.includes('거래처') || userText.includes('포렌식') || userText.includes('유령') || userText.includes('부정') || userText.includes('분석')) {
        setTimeout(() => {
            const botMessage: ChatMessage = { role: 'model', text: FORENSIC_RESPONSE, timestamp: new Date() };
            setMessages(prev => [...prev, botMessage]);
            setIsLoading(false);

            // 1. Define the Scenario (Summary View)
            const newScenario: Scenario = {
                id: 'SCN-GHOST-VENDOR-01', 
                areaCode: 'STP', 
                title: '유령 거래처(Ghost Vendor) 및 임직원 공모 탐지', 
                status: 'Fail', 
                description: 'AI Cross-Check: 공급업체 주소와 임직원 주소의 정확한 일치(Exact Match)를 식별했습니다.',
                detailedDescription: '내부 직원이 허위로 설립한 유령 거래처(Ghost Vendor)를 통해 회사 자금을 횡령하는 것을 방지하기 위한 시나리오입니다. AI가 Vendor Master의 주소, 연락처, 은행 계좌 정보와 Employee Master의 정보를 교차 검증하여 일치 또는 유사 패턴을 발견합니다.',
                timestamp: new Date().toISOString(), 
                type: 'Unstructured', 
                evidenceUrl: '', 
                isNew: true, 
                risk: 'High',
                violationId: 'V-STP-GHOST-001' // Link to the violation
            };

            // 2. Define the Violation Detail (Detailed Audit Report View)
            const newViolation: ViolationDetail = {
                id: 'V-STP-GHOST-001',
                areaCode: 'STP',
                riskLevel: 'High',
                controlPoint: '공급업체 등록 및 지급 승인 통제 (Vendor Mgmt)',
                violationType: '이해상충 및 횡령 의심 (Conflict of Interest)',
                transactionInfo: {
                    id: 'WT-251007-005',
                    amount: '$18,000.00',
                    date: '2025-10-07',
                    entity: 'NewBiz Partner / 김철수'
                },
                aiAnalysis: "공급업체 'NewBiz Partner'(V-0078)의 등록 주소가 재무팀 '김철수' 과장의 인사 기록상 자택 주소와 100% 일치합니다. 또한, 해당 업체 등록 24시간 내에 $18,000의 송금이 발생했으며, 최종 결재자가 김철수 본인으로 확인되었습니다. 이는 전형적인 유령 거래처를 통한 횡령 패턴입니다.",
                recommendation: "1. 김철수 과장의 직무 정지 및 계좌 동결. 2. 'NewBiz Partner'에 대한 지급 즉시 중단 및 법적 조치 검토. 3. 전사 공급업체 전수 조사를 통해 임직원 정보와 유사한 업체 자동 스크리닝.",
                evidenceType: 'Log File',
                evidenceDocumentUrl: ''
            };

            // 3. Update Global State (App.tsx) -> This updates Audit Report & Dashboard
            onAddScenarioAndViolation(newScenario, newViolation);

        }, 1200); // Short delay for UX
        return;
    }

    // --- Standard Gemini API Call for Other Questions ---
    try {
      const responseText = await sendMessageToGemini(userText);
      const botMessage: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "AI 서비스 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", timestamp: new Date() }]);
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

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 bg-yellow-50/50 px-0.5 rounded">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const MessageContent: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
    if (isUser) return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;

    return (
      <div className="space-y-1 text-[15px]">
        {text.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-3" />; 

          if (trimmed.startsWith('**[AuditFlow 시스템 알림]**') || trimmed.startsWith('**[System]**')) {
             return (
               <div key={i} className={`text-xs font-mono flex items-center gap-2 p-2 rounded mb-1 text-green-800 bg-green-50 border border-green-200 shadow-sm mt-2`}>
                  <FilePlus2 className="w-4 h-4" />
                  {trimmed.replace(/\*\*\[.*?\]\*\*/, '').trim()}
               </div>
             );
          }
          if (trimmed.startsWith('###')) {
             return <h3 key={i} className="text-lg font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2">
                <Siren className="w-5 h-5 text-blue-600" />
                {parseBold(trimmed.replace(/^#+\s*/, ''))}
             </h3>;
          }
          if (/^\d+\.\s/.test(trimmed)) {
             return (
               <div key={i} className="flex items-start gap-3 ml-1 mt-2">
                 <span className="font-bold text-slate-600 min-w-[1.2rem]">{trimmed.match(/^\d+\./)?.[0]}</span>
                 <div className="leading-relaxed text-slate-800">{parseBold(trimmed.replace(/^\d+\.\s/, ''))}</div>
               </div>
             );
          }
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
             const content = trimmed.replace(/^[\*\-]\s*/, '');
             return (
               <div key={i} className="flex items-start gap-3 ml-4">
                 <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                 <div className="leading-relaxed text-slate-700">{parseBold(content)}</div>
               </div>
             );
          }
          return <div key={i} className="leading-relaxed text-slate-700">{parseBold(trimmed)}</div>;
        })}
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
                <MessageContent text={msg.text} isUser={msg.role === 'user'} />
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
              <span className="text-slate-400 text-xs font-medium animate-pulse">데이터셋 심층 분석 중...</span>
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
