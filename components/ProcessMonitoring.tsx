
import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Activity, 
  Clock, 
  FileWarning, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShoppingCart, 
  FileSignature, 
  PackageCheck, 
  Truck, 
  CreditCard,
  Filter,
  XCircle,
  Upload,
  Play,
  RotateCcw,
  Loader2,
  Check,
  Database,
  Cpu,
  ShieldCheck,
  Server,
  Table,
  X,
  CheckCircle // Added missing import
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types for ETL ---
type ETLStep = 'SELECT_SOURCE' | 'TRANSFORM' | 'VALIDATE';
type ETLStatus = 'IDLE' | 'PROCESSING' | 'COMPLETED';

interface RawRow {
  eventId: string;
  timestamp: string;
  activity: string;
  resource: string;
  amount: string;
  meta: string; // Dirty metadata field
}

interface CleanRow {
  timestamp: string;
  caseId: string;
  activity: string;
  variant: string;
  status: string;
}

// --- Mock Data for ETL (Process Mining Context) ---
const RAW_DATA_SAMPLE: RawRow[] = [
  { eventId: 'EVT-9901', timestamp: '2025-11-01 14:00', activity: 'Goods Receipt', resource: 'Warehouse_A', amount: '-', meta: 'Ref_PO_Date:2025-11-02; ERR:Receipt_Before_Order' },
  { eventId: 'EVT-9902', timestamp: '2025-10-25 09:00', activity: 'Payment Request', resource: 'Finance_Kim', amount: '50,000,000', meta: 'Urgent; Vendor:ABC_Corp' },
  { eventId: 'EVT-9903', timestamp: '2025-11-03 10:00', activity: 'Payment Approval', resource: 'Finance_Kim', amount: '50,000,000', meta: 'Auto_Approve_Flag:Y; WARN:Self_Approval' },
  { eventId: 'EVT-9904', timestamp: '2025-10-20 18:00', activity: 'Purchase Req', resource: 'Purch_Lee', amount: '12,000', meta: 'Status:Pending; Aging:15days' },
  { eventId: 'NULL', timestamp: '2025.11.05', activity: 'Unknown', resource: 'System', amount: '0', meta: 'Corrupted_Log_Entry' },
];

const CLEAN_DATA_SAMPLE: CleanRow[] = [
  { timestamp: '2025-11-01T14:00:00', caseId: 'CASE-9901', activity: 'Goods Receipt', variant: 'Reverse Sequence', status: 'Critical' },
  { timestamp: '2025-10-25T09:00:00', caseId: 'CASE-9902', activity: 'Payment Request', variant: 'Standard', status: 'Valid' },
  { timestamp: '2025-11-03T10:00:00', caseId: 'CASE-9902', activity: 'Payment Approval', variant: 'SoD Conflict', status: 'Critical' },
  { timestamp: '2025-10-20T18:00:00', caseId: 'CASE-9904', activity: 'Purchase Request', variant: 'Bottleneck', status: 'Warning' },
  { timestamp: '2025-11-05T00:00:00', caseId: 'UNKNOWN', activity: 'Unknown', variant: 'Data Quality', status: 'Invalid' },
];

const ERP_SYSTEMS = [
  { id: 'douzone', name: '더존 Smart A', icon: 'D', color: 'bg-blue-600' },
  { id: 'ecount', name: '이카운트 ERP', icon: 'E', color: 'bg-green-600' },
  { id: 'ksystem', name: '영림원 K-System', icon: 'K', color: 'bg-red-600' },
  { id: 'sap', name: 'SAP S/4HANA', icon: 'S', color: 'bg-slate-700' },
  { id: 'excel', name: 'Excel Upload', icon: 'X', color: 'bg-emerald-600' },
];

const PROCESS_LOGS = [
  "타임스탬프 정합성 검사: 입고일(GR) < 발주일(PO) 역전 현상 감지",
  "직무 분리(SoD) 분석: 기안자(Kim) == 승인자(Kim) 충돌 식별",
  "병목 구간 탐지: 구매 요청 승인 대기 시간 > 360시간 (15일)",
  "이벤트 매핑: Raw Log -> Standard AuditFlow Activity 변환",
  "NULL EventID 제거 및 케이스 연결(Case Correlation) 수행",
  "프로세스 변형(Variant) 분석 완료: 3건의 이상 패턴 태깅"
];


// --- Simulation Data Sets for Monitoring ---

const DATA_IDLE = {
  kpi: [
    { title: "프로세스 가동률", value: "100%", subtext: "최적화", colorClass: "bg-blue-500", icon: Activity },
    { title: "현재 결재 대기", value: "2건", subtext: "정상", colorClass: "bg-emerald-500", textColorClass: "text-slate-900", icon: Clock },
    { title: "평균 처리 시간", value: "1.5h", subtext: "목표 달성", colorClass: "bg-emerald-500", icon: CheckCircle2 },
    { title: "금일 이상 징후", value: "0건", subtext: "안전", colorClass: "bg-slate-400", icon: FileWarning },
  ],
  steps: [
    { id: 1, label: '구매 요청 (PR)', icon: ShoppingCart, status: 'normal', time: '0.5h' },
    { id: 2, label: '결재 승인', icon: FileSignature, status: 'normal', time: '1.0h' },
    { id: 3, label: '발주 생성 (PO)', icon: PackageCheck, status: 'normal', time: '0.2h' },
    { id: 4, label: '물품 입고', icon: Truck, status: 'normal', time: '3.0h' },
    { id: 5, label: '대금 지급', icon: CreditCard, status: 'normal', time: '1.5h' },
  ],
  logs: [],
  chart: [
    { name: '구매팀', processed: 145, delayed: 0 },
    { name: '재무팀', processed: 110, delayed: 1 },
    { name: '영업팀', processed: 210, delayed: 0 },
    { name: '인사팀', processed: 45, delayed: 0 },
  ]
};

const DATA_RISK = {
  kpi: [
    { title: "프로세스 가동률", value: "98.5%", subtext: "정상", colorClass: "bg-blue-500", icon: Activity },
    { title: "현재 결재 대기", value: "14건", subtext: "지연 발생", colorClass: "bg-orange-500", textColorClass: "text-red-600", icon: Clock },
    { title: "평균 처리 시간", value: "4.2h", subtext: "지연됨", colorClass: "bg-orange-500", icon: CheckCircle2 },
    { title: "금일 이상 징후", value: "2건", subtext: "탐지됨", colorClass: "bg-red-500", icon: FileWarning },
  ],
  steps: [
    { id: 1, label: '구매 요청 (PR)', icon: ShoppingCart, status: 'normal', time: '0.5h' },
    { id: 2, label: '결재 승인', icon: FileSignature, status: 'delay', time: '24h+' },
    { id: 3, label: '발주 생성 (PO)', icon: PackageCheck, status: 'normal', time: '1.2h' },
    { id: 4, label: '물품 입고', icon: Truck, status: 'normal', time: '4.5h' },
    { id: 5, label: '대금 지급', icon: CreditCard, status: 'normal', time: '2.0h' },
  ],
  logs: [
    { id: 'LOG-001', time: '10:42', process: '구매 요청 #PR-2025-001', type: '전결 규정 위반 의심', risk: 'High', department: '구매팀', category: 'delayed' },
    { id: 'LOG-002', time: '11:15', process: '대금 지급 #PAY-992', type: '휴면 계좌로 송금 시도', risk: 'Critical', department: '재무팀', category: 'delayed' },
    { id: 'LOG-003', time: '13:20', process: '입고 처리', type: '발주 수량 대비 초과 입고', risk: 'Low', department: '구매팀', category: 'processed' },
    { id: 'LOG-004', time: '14:05', process: '결재 승인', type: '동일인에 의한 중복 승인', risk: 'Medium', department: '재무팀', category: 'delayed' },
  ],
  chart: [
    { name: '구매팀', processed: 145, delayed: 4 },
    { name: '재무팀', processed: 98, delayed: 12 },
    { name: '영업팀', processed: 210, delayed: 2 },
    { name: '인사팀', processed: 45, delayed: 0 },
  ]
};

// Define StatsCard component
const StatsCard = ({ title, value, subtext, icon: Icon, colorClass, textColorClass }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      <p className={`text-xs mt-1 font-medium ${textColorClass || 'text-slate-400'}`}>
        {subtext}
      </p>
    </div>
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

// --- Sub-Component: ETL Modal ---
const ETLModal: React.FC<{ onClose: () => void; onComplete: () => void }> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<ETLStep>('SELECT_SOURCE');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [etlStatus, setEtlStatus] = useState<ETLStatus>('IDLE');
  const [processLogIndex, setProcessLogIndex] = useState(0);

  const startTransformation = () => {
    setEtlStatus('PROCESSING');
    let logStep = 0;
    const interval = setInterval(() => {
      logStep++;
      setProcessLogIndex(logStep);
      if (logStep >= PROCESS_LOGS.length) {
        clearInterval(interval);
        setTimeout(() => setEtlStatus('COMPLETED'), 800);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-400" />
                <div>
                    <h3 className="text-lg font-bold">ERP 데이터 통합 및 정제 (ETL Wizard)</h3>
                    <p className="text-xs text-slate-400">외부 ERP 데이터를 AuditFlow 표준 포맷으로 변환합니다.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
            <div className="flex items-center justify-center gap-8">
                {['데이터 소스 선택', 'AI 변환 시뮬레이션', '데이터 검증 및 적재'].map((label, idx) => {
                    const stepNum = idx + 1;
                    const isActive = (currentStep === 'SELECT_SOURCE' && stepNum === 1) ||
                                     (currentStep === 'TRANSFORM' && stepNum === 2) ||
                                     (currentStep === 'VALIDATE' && stepNum === 3);
                    const isCompleted = (currentStep === 'TRANSFORM' && stepNum < 2) ||
                                        (currentStep === 'VALIDATE' && stepNum < 3);
                    return (
                        <div key={idx} className="flex items-center gap-2">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                 {isCompleted ? <Check className="w-3 h-3"/> : stepNum}
                             </div>
                             <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>{label}</span>
                             {idx < 2 && <ArrowRight className="w-4 h-4 text-slate-300 ml-4" />}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* Step 1: Source Selection */}
            {currentStep === 'SELECT_SOURCE' && (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800 mb-8">연동할 ERP 시스템을 선택하세요</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl">
                        {ERP_SYSTEMS.map((erp) => (
                            <button
                                key={erp.id}
                                onClick={() => setSelectedSource(erp.id)}
                                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${selectedSource === erp.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl ${erp.color} text-white text-xl font-bold flex items-center justify-center mb-3`}>{erp.icon}</div>
                                <span className="font-semibold text-slate-700 text-sm">{erp.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-12 flex justify-end w-full max-w-4xl">
                         <button onClick={() => setCurrentStep('TRANSFORM')} disabled={!selectedSource} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2">
                            다음 단계 <ArrowRight className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            )}

            {/* Step 2: Transformation */}
            {currentStep === 'TRANSFORM' && (
                <div className="h-full flex flex-col">
                     <div className="p-3 bg-white border-b flex justify-between items-center px-6">
                        <span className="font-bold text-slate-700 flex items-center gap-2"><Cpu className="w-4 h-4"/> AI Mapping Engine</span>
                        {etlStatus === 'IDLE' ? (
                            <button onClick={startTransformation} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"><Play className="w-3 h-3 fill-current"/> 변환 시작</button>
                        ) : etlStatus === 'COMPLETED' ? (
                            <button onClick={() => setCurrentStep('VALIDATE')} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2">결과 검증 <ArrowRight className="w-3 h-3"/></button>
                        ) : (
                            <span className="text-sm text-blue-600 font-bold animate-pulse">처리 중...</span>
                        )}
                     </div>
                     <div className="flex-1 flex overflow-hidden">
                        {/* Raw Data */}
                        <div className="flex-1 bg-slate-50 border-r border-slate-200 flex flex-col">
                            <div className="p-2 bg-slate-100 border-b text-xs font-bold text-slate-500 uppercase px-4 flex justify-between">
                                <span>Raw ERP Event Log (Douzone)</span>
                                <span className="text-red-500 font-bold text-[10px]">⚠️ Anomalies Detected</span>
                            </div>
                            <div className="p-4 overflow-auto">
                                <table className="w-full text-xs bg-white border border-slate-200 shadow-sm font-mono">
                                    <thead className="bg-slate-50"><tr><th className="p-2 border">EventID</th><th className="p-2 border">Time</th><th className="p-2 border">Activity</th><th className="p-2 border">Resource</th><th className="p-2 border">MetaData (Dirty)</th></tr></thead>
                                    <tbody>
                                        {RAW_DATA_SAMPLE.map((r,i) => (
                                            <motion.tr key={i} animate={{ opacity: etlStatus === 'COMPLETED' ? 0.3 : 1 }} className="border-b">
                                                <td className="p-2 border text-slate-500">{r.eventId}</td>
                                                <td className="p-2 border">{r.timestamp}</td>
                                                <td className="p-2 border font-bold text-slate-700">{r.activity}</td>
                                                <td className="p-2 border">{r.resource}</td>
                                                <td className="p-2 border text-xs text-red-400 break-all">{r.meta}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* Animation Overlay */}
                        <div className="w-48 bg-slate-900 flex flex-col items-center justify-center relative z-10 border-x border-slate-700">
                             {etlStatus === 'PROCESSING' ? (
                                 <div className="text-center">
                                     <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4"/>
                                     <p className="text-xs text-blue-300 font-mono mb-2">Step {processLogIndex + 1}</p>
                                     <p className="text-xs text-white px-2">{PROCESS_LOGS[processLogIndex]}</p>
                                 </div>
                             ) : etlStatus === 'COMPLETED' ? (
                                 <motion.div initial={{scale:0}} animate={{scale:1}} className="text-center">
                                     <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2"/>
                                     <p className="text-sm font-bold text-white">변환 완료</p>
                                 </motion.div>
                             ) : <ArrowRight className="w-8 h-8 text-slate-600"/>}
                        </div>
                        {/* Clean Data */}
                        <div className="flex-1 bg-white flex flex-col">
                            <div className="p-2 bg-blue-50 border-b text-xs font-bold text-blue-800 uppercase px-4">AuditFlow Standard Log</div>
                            <div className="p-4 overflow-auto flex-1">
                                {etlStatus === 'COMPLETED' ? (
                                    <table className="w-full text-xs bg-white border border-blue-100 shadow-sm">
                                        <thead className="bg-blue-50"><tr><th className="p-2 border">Timestamp</th><th className="p-2 border">CaseID</th><th className="p-2 border">Activity</th><th className="p-2 border">Variant/Status</th></tr></thead>
                                        <tbody>
                                            {CLEAN_DATA_SAMPLE.map((r,i) => (
                                                <motion.tr key={i} initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} transition={{delay:i*0.1}} className="border-b">
                                                    <td className="p-2 border font-mono">{r.timestamp.split('T')[0]}...</td>
                                                    <td className="p-2 border">{r.caseId}</td>
                                                    <td className="p-2 border"><span className="px-1 bg-slate-100 rounded">{r.activity}</span></td>
                                                    <td className="p-2 border">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500">{r.variant}</span>
                                                            <span className={`font-bold ${r.status === 'Critical' ? 'text-red-600' : r.status === 'Warning' ? 'text-orange-500' : r.status === 'Invalid' ? 'text-gray-400' : 'text-green-600'}`}>
                                                                {r.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-300 flex-col">
                                        <Table className="w-12 h-12 mb-2 opacity-20"/>
                                        <p>변환 대기 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
            )}

            {/* Step 3: Validate & Load */}
            {currentStep === 'VALIDATE' && (
                <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
                     <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-lg w-full text-center">
                         <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                         <h3 className="text-2xl font-bold text-slate-900">데이터 정합성 검증 완료</h3>
                         <p className="text-slate-500 mb-6">품질 점수: <strong>99.8%</strong> (오류 0건)</p>
                         <button onClick={onComplete} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                             <Server className="w-5 h-5"/> 프로세스 마이닝 시작
                         </button>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};


// --- Main Component: ProcessMonitoring ---
const ProcessMonitoring: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'complete'>('idle');
  const [showETLModal, setShowETLModal] = useState(false);
  const [filter, setFilter] = useState<{ dept: string | null; status: 'processed' | 'delayed' | null }>({ dept: null, status: null });

  const currentData = status === 'complete' ? DATA_RISK : DATA_IDLE;

  const handleBarClick = (data: any, status: 'processed' | 'delayed') => {
    if (filter.dept === data.name && filter.status === status) {
      setFilter({ dept: null, status: null });
    } else {
      setFilter({ dept: data.name, status });
    }
  };

  const filteredLogs = currentData.logs.filter((log: any) => {
    if (filter.dept && log.department !== filter.dept) return false;
    if (filter.status && log.category !== filter.status) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 relative min-h-screen">
      
      {/* ETL Modal */}
      {showETLModal && (
          <ETLModal 
            onClose={() => setShowETLModal(false)} 
            onComplete={() => {
                setShowETLModal(false);
                setStatus('complete');
            }} 
          />
      )}

      {/* Header */}
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">기업 프로세스 모니터링 (Process Mining)</h2>
        <p className="text-slate-500 mt-1">실시간 트랜잭션 흐름 추적 및 병목 구간 탐지</p>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-300 text-slate-500 text-sm">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 System Status: Online
            </div>
            {status === 'complete' && (
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    분석 데이터 로드됨 (2025-Q4)
                </span>
            )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowETLModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            ERP 데이터 연동 및 분석
          </button>
          
          <button 
            onClick={() => setStatus('idle')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentData.kpi.map((kpi: any, idx: number) => (
          <StatsCard key={idx} {...kpi} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Process Map & Logs (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Process Flow Map */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600"/>
                실시간 구매-결제 프로세스 흐름 (P2P Flow)
              </h3>
              {status === 'complete' && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full animate-pulse">병목 구간 감지됨</span>}
            </div>
            
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-4 px-2 py-6">
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
              {currentData.steps.map((step: any, index: number) => {
                const isDelayed = step.status === 'delay';
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex flex-col items-center relative w-full lg:w-auto z-0 animate-in fade-in zoom-in duration-500">
                     {index > 0 && <div className="lg:hidden h-8 w-0.5 bg-slate-300 my-1"></div>}
                    <div className={`flex flex-col items-center justify-center w-full lg:w-40 p-4 rounded-xl border-2 transition-all duration-500 ${isDelayed ? 'bg-orange-50 border-orange-200 shadow-md shadow-orange-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className={`p-3 rounded-full mb-3 transition-colors duration-500 ${isDelayed ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 text-center">{step.label}</span>
                      <span className={`text-xs mt-1 font-medium transition-colors duration-300 ${isDelayed ? 'text-red-500' : 'text-slate-400'}`}>
                        {isDelayed ? `지연 발생 (${step.time})` : `평균 ${step.time}`}
                      </span>
                      {isDelayed && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-sm">Delay</div>}
                    </div>
                    {index < currentData.steps.length - 1 && <ArrowRight className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 bg-white rounded-full" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly Logs */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${status === 'complete' ? 'text-red-600' : 'text-slate-400'}`}/>
                실시간 이상 징후 로그
              </h3>
              <div className="flex items-center gap-2">
                {filter.dept && (
                   <button onClick={() => setFilter({ dept: null, status: null })} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors">
                     <Filter className="w-3 h-3" /> {filter.dept} : {filter.status === 'processed' ? '정상' : '지연'} <XCircle className="w-3 h-3 ml-1" />
                   </button>
                )}
                {status === 'complete' && <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded animate-pulse">Live Detection</span>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">시간</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">부서</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">프로세스</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이상 내용</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">위험도</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors animate-in fade-in slide-in-from-left-5">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 font-mono">{log.time}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-600">{log.department}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">{log.process}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{log.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${log.risk === 'Critical' ? 'bg-red-100 text-red-700' : log.risk === 'High' ? 'bg-orange-100 text-orange-700' : log.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{log.risk}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-100" />
                                <p className="text-sm font-medium text-slate-500">탐지된 이상 징후가 없습니다.</p>
                            </div>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Chart (Span 1) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6">부서별 처리 현황</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.chart} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar dataKey="processed" name="정상 처리" stackId="a" fill="#3b82f6" barSize={40} cursor="pointer" onClick={(data) => handleBarClick(data, 'processed')} fillOpacity={filter.status === 'delayed' ? 0.3 : 1} animationDuration={1000} />
                <Bar dataKey="delayed" name="지연 건수" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} cursor="pointer" onClick={(data) => handleBarClick(data, 'delayed')} fillOpacity={filter.status === 'processed' ? 0.3 : 1} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800 mb-2">분석 인사이트</h4>
            {status === 'complete' ? (
                <p className="text-xs text-slate-600 leading-relaxed animate-in fade-in">
                현재 <span className="font-bold text-blue-600">재무팀</span>에서 결재 대기 건수가 급증하고 있어 전체 프로세스 리드타임에 영향을 주고 있습니다.
                </p>
            ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  모든 부서의 업무 처리 속도가 KPI 목표치(2.0h) 이내로 유지되고 있습니다.
                </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProcessMonitoring;
