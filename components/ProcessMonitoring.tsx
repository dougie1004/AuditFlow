
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, 
  Clock, 
  FileWarning, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Database,
  Cpu,
  ShieldCheck,
  Server,
  Table,
  X,
  CheckCircle,
  Search,
  GitBranch,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
  Upload,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Mock Data for AI Forensic Scenario ---

// Task 2: AI Pre-processing Results
const AI_TAGGING_RESULTS = [
  { keyword: "대표님 지시", count: 12, risk: "High", type: "Override" },
  { keyword: "긴급 선처리", count: 45, risk: "Medium", type: "Urgent" },
  { keyword: "분할 결재", count: 8, risk: "High", type: "Structuring" },
  { keyword: "후증빙", count: 23, risk: "High", type: "Documentation" },
  { keyword: "수기 입력", count: 156, risk: "Medium", type: "Manual" },
];

// Task 4: Fraud Detection Report
const HIGH_RISK_CASES = [
  { id: 'INV-2025-9001', vendor: 'V-7782 (주)가나다', scenario: 'Maverick Buying', evidence: 'PO Ref Missing; Log: "대표님 지시로 긴급 진행"', score: 98, status: 'Open' },
  { id: 'INV-2025-9045', vendor: 'V-1022 알파테크', scenario: 'Split PO', evidence: 'Same Amt/Date (450만원 x 3회); TCODE: Manual', score: 92, status: 'Investigating' },
  { id: 'INV-2025-9112', vendor: 'V-3301 (주)미래', scenario: 'Ghost Vendor', evidence: 'Address Match with Employee (Kim); No GR', score: 95, status: 'Open' },
  { id: 'INV-2025-8821', vendor: 'V-5504 베타솔루션', scenario: 'Retroactive PO', evidence: 'Inv Date < PO Date (-5 days); Log: "후증빙"', score: 85, status: 'Resolved' },
  { id: 'INV-2025-9200', vendor: 'V-9901 제타', scenario: 'Limit Bypass', evidence: 'Approval Chain Skipped; Log: "전결 규정 예외"', score: 88, status: 'Open' },
];

const PROCESS_VARIANTS = [
  { name: 'Variant 1: Happy Path', count: 1250, percent: 86, color: '#3b82f6', path: ['Purchase Order', 'Goods Receipt', 'Invoice Receipt', 'Payment'] },
  { name: 'Variant 2: Maverick Buying', count: 145, percent: 10, color: '#ef4444', path: ['Invoice Receipt (No PO)', 'Payment'] },
  { name: 'Variant 3: Split PO', count: 58, percent: 4, color: '#f97316', path: ['PO #1', 'PO #2', 'Invoice', 'Payment'] },
];

// --- Sub-Component: ETL Modal (The 4-Task Simulation) ---
const ETLModal: React.FC<{ onClose: () => void; onComplete: () => void }> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const TASKS = [
    { title: "Task 1: Data Linking", desc: "SAP Table Join (PO-INV-PAY)" },
    { title: "Task 2: AI Pre-processing", desc: "NLP Text Tagging & Classification" },
    { title: "Task 3: Process Mining", desc: "Timestamp Analysis & Variant Discovery" },
    { title: "Task 4: Risk Scoring", desc: "Fraud Detection & Report Generation" }
  ];

  useEffect(() => {
    const processSteps = async () => {
      // Step 1
      setStep(1);
      setLogs(prev => [...prev, "[System] Loading Purchase_Order.csv, AP_Invoice.csv, Payment.csv...", "[Linker] Matching 1,453 Cases (Match Rate: 98.2%)... Done."]);
      await new Promise(r => setTimeout(r, 1200));

      // Step 2
      setStep(2);
      setLogs(prev => [...prev, "[AI-NLP] Analyzing 'Raw_Log_Text' column...", "[AI-NLP] Detected 5 Risk Keywords: '지시', '분할', '선처리'...", "[AI-NLP] Tagging 156 Manual Entries... Done."]);
      await new Promise(r => setTimeout(r, 1200));

      // Step 3
      setStep(3);
      setLogs(prev => [...prev, "[Miner] Calculating Timestamp Deltas (PO -> Inv -> Pay)...", "[Miner] Identified 3 Major Variants.", "[Miner] Variant 2 (No PO) flagged as High Risk (Red)... Done."]);
      await new Promise(r => setTimeout(r, 1200));

      // Step 4
      setStep(4);
      setLogs(prev => [...prev, "[Risk Engine] Calculating Risk Scores (0-100)...", "[Risk Engine] 5 Critical Fraud Indicators Detected.", "[Report] Final Audit Report Generated."]);
      await new Promise(r => setTimeout(r, 1000));

      onComplete();
    };

    processSteps();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        <div className="bg-slate-900 p-6 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg animate-pulse">
                <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Forensic Auditor</h3>
              <p className="text-xs text-blue-300">SAP S/4HANA P2P Process Analysis</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 bg-slate-50">
            <div className="space-y-6">
                {TASKS.map((task, idx) => {
                    const taskNum = idx + 1;
                    const isActive = step === taskNum;
                    const isCompleted = step > taskNum;
                    
                    return (
                        <div key={idx} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                                isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                                isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-300' : 
                                'bg-white border-slate-300 text-slate-400'
                            }`}>
                                {isCompleted ? <Check className="w-5 h-5" /> : taskNum}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-bold text-sm ${isActive ? 'text-blue-700' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{task.title}</h4>
                                <p className="text-xs text-slate-500">{task.desc}</p>
                            </div>
                            {isActive && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                    )
                })}
            </div>

            <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-32 overflow-y-auto shadow-inner border border-slate-700">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                ))}
                <div className="animate-pulse">_</div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
const ProcessMonitoring: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'complete'>('idle');
  const [showETL, setShowETL] = useState(false);

  const handleStartAnalysis = () => {
    setShowETL(true);
  };

  const handleReset = () => {
    setStatus('idle');
  };

  if (showETL) {
      return <ETLModal onClose={() => setShowETL(false)} onComplete={() => { setShowETL(false); setStatus('complete'); }} />;
  }

  // --- IDLE STATE ---
  if (status === 'idle') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-200 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">AI Forensic Audit</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    SAP S/4HANA에서 추출된 Raw Data (PO, Invoice, Payment)를 분석하여<br/>
                    P2P 프로세스 흐름을 시각화하고 부정 징후를 탐지합니다.
                </p>
                <div className="flex gap-4 justify-center">
                    <button onClick={handleStartAnalysis} className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-lg">
                        <Play className="w-6 h-6" /> 분석 시작
                    </button>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-8 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> Purchase_Order.csv</span>
                    <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> AP_Invoice.csv</span>
                    <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> Payment.csv</span>
                </div>
            </div>
        </div>
      );
  }

  // --- COMPLETE STATE (Dashboard) ---
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
                AI Forensic Analysis Result
            </h2>
            <p className="text-slate-500 text-sm mt-1">Audit Opinion: 비정형 텍스트 분석 결과, <span className="font-bold text-red-600">통제 우회(Maverick Buying)</span> 및 <span className="font-bold text-red-600">임의 지시</span>에 의한 부정 위험이 높음.</p>
        </div>
        <button onClick={handleReset} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Task 1 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Cases</p>
            <h3 className="text-2xl font-bold text-slate-900">1,453</h3>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Database className="w-3 h-3"/> Linked Successfully</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Match Rate</p>
            <h3 className="text-2xl font-bold text-green-600">98.2%</h3>
            <p className="text-xs text-slate-400 mt-1">PO-INV-PAY Consistency</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Process Variants</p>
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
            <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><GitBranch className="w-3 h-3"/> 3 High Risk Patterns</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 bg-red-50">
            <p className="text-xs text-red-500 font-bold uppercase mb-1">Fraud Detected</p>
            <h3 className="text-2xl font-bold text-red-700">5 Cases</h3>
            <p className="text-xs text-red-600 mt-1 font-bold">Require Immediate Audit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Task 3: Process Mining Visualization */}
        <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Task 3: Process Mining (Visualization)
                </h3>
            </div>
            
            {/* Visual Process Map */}
            <div className="space-y-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {/* Happy Path */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Variant 1: Happy Path (86%)</span>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {['Purchase Order', 'Goods Receipt', 'Invoice Receipt', 'Payment'].map((step, i) => (
                            <React.Fragment key={i}>
                                <div className="px-4 py-3 bg-white border-2 border-blue-500 rounded-lg shadow-sm font-bold text-sm text-slate-700 flex flex-col items-center min-w-[120px]">
                                    {step}
                                </div>
                                {i < 3 && <ArrowRight className="w-5 h-5 text-blue-400" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Maverick Buying (Risk) */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Variant 2: Maverick Buying (10%)</span>
                        <div className="h-px bg-red-200 flex-1"></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="px-4 py-3 bg-red-50 border-2 border-dashed border-red-300 rounded-lg shadow-sm font-bold text-sm text-red-400 flex flex-col items-center min-w-[120px] opacity-50">
                                Purchase Order
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <X className="w-8 h-8 text-red-600" />
                            </div>
                        </div>
                        <div className="h-1 w-8 bg-red-500"></div>
                        <div className="px-4 py-3 bg-white border-2 border-red-500 rounded-lg shadow-sm font-bold text-sm text-slate-700 flex flex-col items-center min-w-[120px] relative">
                            Invoice Receipt
                            <div className="absolute -top-3 -right-3 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-yellow-200 whitespace-nowrap">
                                Log: "대표님 지시"
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-red-500" />
                        <div className="px-4 py-3 bg-white border-2 border-red-500 rounded-lg shadow-sm font-bold text-sm text-slate-700 flex flex-col items-center min-w-[120px]">
                            Payment
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Task 2: AI Pre-processing Results */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                Task 2: AI Text Analysis
            </h3>
            <p className="text-xs text-slate-500 mb-4">Detected 'Risk' Keywords from Raw_Log_Text</p>
            
            <div className="space-y-3">
                {AI_TAGGING_RESULTS.map((tag, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${tag.risk === 'High' ? 'bg-red-500' : 'bg-orange-400'}`}></span>
                            <span className="font-bold text-slate-700 text-sm">"{tag.keyword}"</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border">{tag.type}</span>
                            <span className="text-sm font-bold text-slate-900">{tag.count}건</span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100 text-xs text-purple-800 leading-relaxed">
                <span className="font-bold">Insight:</span> 전체 1,453건 중 약 10%의 거래에서 수기(Manual) 입력이나 임의 지시에 의한 프로세스 예외 처리가 발견되었습니다.
            </div>
        </div>
      </div>

      {/* Task 4: Fraud Detection Report */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Task 4: Fraud Detection Report (Deep Dive)
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">Case ID</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Detected Scenario</th>
                        <th className="px-4 py-3">Evidence (AI Analysis)</th>
                        <th className="px-4 py-3 text-center">Risk Score</th>
                        <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {HIGH_RISK_CASES.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3 font-mono text-blue-600 font-medium">{row.id}</td>
                            <td className="px-4 py-3 text-slate-700">{row.vendor}</td>
                            <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                                    {row.scenario}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={row.evidence}>
                                {row.evidence}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-bold text-slate-800 border border-slate-200 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    {row.score}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button className="text-xs font-bold text-blue-600 hover:underline">Investigate</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default ProcessMonitoring;
