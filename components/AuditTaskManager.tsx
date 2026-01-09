
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  FileText, 
  Search, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  MoreHorizontal, 
  FileWarning, 
  Bot, 
  ChevronRight,
  Sparkles,
  Paperclip,
  X,
  Siren,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface TimelineEvent {
  id: number;
  time: string;
  type: 'info' | 'alert' | 'success';
  content: string;
  subContent?: string;
  isNew?: boolean;
}

interface WhistleBlowerReport {
  id: string;
  date: string;
  title: string;
  content: string;
  dept: string;
  status: 'received' | 'analyzing' | 'investigating' | 'closed';
  risk: 'High' | 'Medium' | 'Low';
  aiAnalysis?: {
    keywords: string[];
    relatedDocs: number;
    relatedEmails: number;
    summary: string;
  };
}

// --- Mock Data ---
const INITIAL_TIMELINE: TimelineEvent[] = [
  { id: 1, time: '09:00', type: 'info', content: '전일 법인카드 사용 내역 45건 분석 완료', subContent: '특이사항 없음 (모두 정상 승인)' },
  { id: 2, time: '10:30', type: 'alert', content: '심야 시간(01:20) 택시비 결제 건 발견', subContent: '대상자(박대리)에게 소명 요청 메일 자동 발송됨' },
  { id: 3, time: '13:00', type: 'success', content: '신규 등록 거래처 \'ABC상사\' 휴폐업 조회', subContent: '국세청 API 연동 결과: 정상 사업자' },
];

const MOCK_REPORTS: WhistleBlowerReport[] = [
  { 
    id: 'WB-2025-001', 
    date: '2025.11.20', 
    title: '영업팀 법인카드 깡 의심 제보', 
    content: '영업1팀 김부장이 법인카드로 상품권을 대량 구매 후 현금화하는 것 같습니다. 확인 부탁드립니다.',
    dept: '영업본부',
    status: 'analyzing',
    risk: 'High',
    aiAnalysis: {
      keywords: ['상품권', '현금화', '영업1팀', '대량 구매'],
      relatedDocs: 2, // e.g. Expense Report
      relatedEmails: 0,
      summary: '최근 3개월간 영업1팀 법인카드 내역에서 "상품권" 키워드가 포함된 결제 내역 5건(총 500만원)이 식별되었습니다.'
    }
  },
  { 
    id: 'WB-2025-002', 
    date: '2025.11.18', 
    title: '자재팀 협력사 유착 의심', 
    content: '특정 업체(S사)에만 발주가 몰리고 있습니다. 단가 비교가 제대로 되는지 의문입니다.',
    dept: '구매자재팀',
    status: 'investigating',
    risk: 'Medium',
    aiAnalysis: {
      keywords: ['S사', '몰아주기', '단가 비교'],
      relatedDocs: 5, // Contracts, POs
      relatedEmails: 3,
      summary: 'S사 발주 비율이 전년 대비 40% 증가했습니다. 경쟁 입찰 기록이 누락된 건이 2건 발견되었습니다.'
    }
  },
  { 
    id: 'WB-2025-003', 
    date: '2025.11.15', 
    title: '근태 부정 행위 신고', 
    content: 'R&D센터 일부 인원이 출근 카드만 찍고 외출합니다.',
    dept: 'R&D',
    status: 'received',
    risk: 'Low'
  }
];

// --- Components ---

const ReportModal: React.FC<{ report: WhistleBlowerReport; onClose: () => void }> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Siren className="w-5 h-5 text-red-400" />
            <h3 className="font-bold">제보 상세 분석</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${report.risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {report.risk} Risk
              </span>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              "{report.content}"
            </p>
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
              <span>부서: {report.dept}</span>
              <span>일자: {report.date}</span>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" /> AuditFlow AI 분석 결과
            </h4>
            
            {report.aiAnalysis ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {report.aiAnalysis.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100">
                      #{kw}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-4 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> 연관 문서 {report.aiAnalysis.relatedDocs}건</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3"/> 관련 이메일 {report.aiAnalysis.relatedEmails}건</span>
                </div>

                <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-purple-700 mr-1">요약:</span>
                  {report.aiAnalysis.summary}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                아직 AI 분석이 수행되지 않았습니다.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">닫기</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">정밀 조사 전환</button>
        </div>
      </motion.div>
    </div>
  );
};


const AuditTaskManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ceo' | 'whistleblow'>('ceo');
  const [ceoInput, setCeoInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ceoResult, setCeoResult] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(INITIAL_TIMELINE);
  const [selectedReport, setSelectedReport] = useState<WhistleBlowerReport | null>(null);

  // --- CEO Request Logic ---
  const handleCeoSubmit = () => {
    if (!ceoInput.trim()) return;
    setIsAnalyzing(true);
    setCeoResult(null);

    // Simulate AI Processing (Fast demo speed)
    setTimeout(() => {
      setIsAnalyzing(false);
      
      // 1. Add to Timeline
      const newEvent: TimelineEvent = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        type: 'success',
        content: `경영진 지시사항 '${ceoInput.substring(0, 10)}...' 리포트 생성 완료`,
        subContent: 'AI가 관련 데이터셋 2개를 스캔하여 의심 사례를 식별했습니다.',
        isNew: true
      };
      setTimeline(prev => [newEvent, ...prev]);

      // 2. Show Result Card
      setCeoResult({
        summary: `요청하신 "${ceoInput}"에 대한 분석 결과입니다.`,
        findings: 3,
        details: 'Marketing_Exp_2025.xlsx 데이터와 ERP 전표를 대조한 결과, 동일 금액/동일 가맹점의 중복 결제 의심 건이 3건 발견되었습니다.',
        file: 'CEO_Request_Report_20251206.pdf'
      });
      
    }, 400); 
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      {selectedReport && <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">감사 업무 및 이슈 관리 (Audit Task & Issues)</h2>
        <p className="text-slate-500 mt-1">경영진 수명 업무 수행 및 내부 제보 처리, 상시 감사 현황을 모니터링합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
        
        {/* Left Panel: Request & Whistleblowing */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('ceo')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'ceo' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Bot className="w-4 h-4" /> 경영진 지시 (CEO Request)
            </button>
            <button 
              onClick={() => setActiveTab('whistleblow')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'whistleblow' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Siren className="w-4 h-4" /> 내부 제보 (Whistleblowing)
            </button>
          </div>

          <div className="p-6 flex-1 bg-slate-50/30 overflow-y-auto">
            {activeTab === 'ceo' ? (
              <div className="space-y-6">
                {/* Input Area */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    경영진의 지시사항을 입력하세요
                  </label>
                  <div className="relative">
                    <textarea 
                      value={ceoInput}
                      onChange={(e) => setCeoInput(e.target.value)}
                      placeholder="예: 최근 3개월간 마케팅비 지출 내역 중 중복 지급된 건이 있는지 확인해 봐."
                      className="w-full h-32 p-4 pr-12 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button 
                      onClick={handleCeoSubmit}
                      disabled={isAnalyzing || !ceoInput}
                      className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-md"
                    >
                      {isAnalyzing ? <Clock className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 pl-0.5"/>}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" /> AI가 ERP 원장과 관련 비정형 문서를 자동으로 스캔합니다.
                  </p>
                </div>

                {/* Analysis Result Card */}
                <AnimatePresence>
                  {isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center py-12"
                    >
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        <Bot className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">AI 정밀 분석 중...</h3>
                      <p className="text-sm text-slate-500 mt-1">관련 데이터셋 추출 및 이상 패턴 매칭 중</p>
                    </motion.div>
                  )}

                  {ceoResult && !isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                         <h3 className="font-bold flex items-center gap-2"><CheckCircle className="w-5 h-5"/> 분석 완료</h3>
                         <span className="text-xs bg-white/20 px-2 py-1 rounded">Just now</span>
                      </div>
                      <div className="p-6">
                        <p className="text-slate-800 font-medium mb-4">{ceoResult.summary}</p>
                        
                        <div className="flex gap-4 mb-6">
                           <div className="flex-1 bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                              <p className="text-xs text-red-500 font-bold uppercase">의심 사례</p>
                              <p className="text-2xl font-bold text-red-700">{ceoResult.findings}건</p>
                           </div>
                           <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                              <p className="text-xs text-slate-500 font-bold uppercase">분석 데이터</p>
                              <p className="text-2xl font-bold text-slate-700">12.5MB</p>
                           </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 mb-4 leading-relaxed">
                           <span className="font-bold text-slate-800">상세 내용:</span> {ceoResult.details}
                        </div>

                        <button className="w-full py-3 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
                           <Paperclip className="w-4 h-4" /> {ceoResult.file} 다운로드
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Whistleblowing Form (Collapsed for demo, focuses on list) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                     <h3 className="font-bold text-slate-800">새로운 제보 등록하기</h3>
                     <p className="text-xs text-slate-500">익명성이 보장됩니다.</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700">등록 폼 열기</button>
                </div>

                {/* List */}
                <div>
                   <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 px-1">접수된 제보 현황 ({MOCK_REPORTS.length})</h3>
                   <div className="space-y-3">
                      {MOCK_REPORTS.map((report) => (
                         <div 
                           key={report.id} 
                           onClick={() => setSelectedReport(report)}
                           className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                         >
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${report.risk === 'High' ? 'bg-red-500' : report.risk === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                                  <span className="text-xs font-bold text-slate-500">{report.id}</span>
                                  <span className="text-xs text-slate-400">• {report.date}</span>
                               </div>
                               <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                                  report.status === 'received' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  report.status === 'analyzing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-purple-50 text-purple-600 border-purple-100'
                               }`}>
                                  {report.status}
                               </span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{report.title}</h4>
                            <p className="text-sm text-slate-600 line-clamp-1">{report.content}</p>
                            
                            {report.aiAnalysis && (
                               <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                  <Sparkles className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs text-blue-600 font-medium">AI 분석 완료: 키워드 매칭됨</span>
                               </div>
                            )}
                         </div>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Daily Briefing Timeline */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
           <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-600" /> Today's AI Briefing
              </h3>
              <p className="text-xs text-slate-500 mt-1">실시간 상시 감사 로그 (Live Feed)</p>
           </div>
           
           <div className="p-5 flex-1 overflow-y-auto">
              <div className="space-y-6 relative">
                 {/* Vertical Line */}
                 <div className="absolute top-2 left-[19px] bottom-0 w-0.5 bg-slate-100 -z-10"></div>

                 <AnimatePresence initial={false}>
                    {timeline.map((event) => (
                       <motion.div 
                          key={event.id}
                          initial={event.isNew ? { opacity: 0, x: -20 } : { opacity: 1 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-4 relative"
                       >
                          {/* Dot */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 ${
                             event.type === 'alert' ? 'bg-red-100 text-red-600' : 
                             event.type === 'success' ? 'bg-green-100 text-green-600' : 
                             'bg-blue-100 text-blue-600'
                          }`}>
                             {event.type === 'alert' ? <AlertTriangle className="w-5 h-5"/> : 
                              event.type === 'success' ? <CheckCircle className="w-5 h-5"/> : 
                              <Search className="w-5 h-5"/>}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-2">
                             <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded mb-1 inline-block ${
                                   event.isNew ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
                                }`}>
                                   {event.time}
                                </span>
                             </div>
                             <p className="text-sm font-bold text-slate-800">{event.content}</p>
                             {event.subContent && (
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                                   {event.subContent}
                                </p>
                             )}
                          </div>
                       </motion.div>
                    ))}
                 </AnimatePresence>

                 {/* End of Timeline */}
                 <div className="flex gap-4 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center shrink-0">
                       <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    </div>
                    <div className="py-2 text-xs text-slate-400">이전 내역 더보기...</div>
                 </div>
              </div>
           </div>
           
           <div className="p-4 border-t border-slate-100 bg-slate-50/30">
              <button className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                 전체 로그 리포트 다운로드
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AuditTaskManager;
