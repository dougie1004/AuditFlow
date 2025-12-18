import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, File, Search, Filter, Trash2, Download, Eye, X, ZoomIn, ZoomOut, Printer, Grid, Terminal, Sparkles, Loader2, CheckCircle, ArrowRight, ChevronLeft, ChevronRight, AlertTriangle, Siren } from 'lucide-react';
import { Scenario, ViolationDetail, MockUploadFile } from '../types';
import type { AuditAreaCode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// Define a type for the AI_DISCOVERY_POOL items to ensure they conform to Scenario and ViolationDetail interfaces.
type AiDiscoveryItem = {
  scenario: Scenario;
  violation: ViolationDetail;
};

// --- Expanded Discovery Scenarios Pool ---
const AI_DISCOVERY_POOL: AiDiscoveryItem[] = [
  {
    scenario: {
        id: 'SCN-SEC-004', areaCode: 'SEC',
        title: '퇴사자 계정을 이용한 허위 세금계산서 발행',
        status: 'Fail', risk: 'High', type: 'Unstructured',
        isNew: true, timestamp: new Date().toISOString(),
        description: 'AI 탐지: 퇴사 후에도 활성화된 ERP 계정을 이용한 부정 거래를 탐지했습니다.',
        detailedDescription: '퇴사일 경과 후에도 ERP 접속 로그가 발견되고, 해당 계정으로 신규 거래처 등록 및 세금계산서 발행 이력이 있는지 교차 검증한 결과입니다.',
        evidenceUrl: '', violationId: 'V-SEC-004'
    },
    violation: {
        id: 'V-SEC-004', areaCode: 'SEC', riskLevel: 'High',
        controlPoint: '퇴사자 접근 통제 및 계정 권한 회수', violationType: '퇴사자 계정 도용',
        transactionInfo: { id: 'TAX-INV-20251205-881', amount: '25,000,000 KRW', date: '2025-12-05', entity: '박지성 (E5001, 퇴사자)' },
        aiAnalysis: '퇴사자(E5001)의 계정이 비활성화되지 않고, 퇴사 5일 후인 2025-12-05에 외부 IP에서 접속하여 허위 세금계산서 2.5천만원을 발행한 로그가 식별되었습니다.',
        recommendation: '즉시 해당 계정 영구 차단 및 IP 추적을 통해 실제 접속자 식별. 퇴사 프로세스 전수 점검 필요.', evidenceType: 'Log File'
    }
  },
  {
    scenario: {
        id: 'SCN-STP-005', areaCode: 'STP',
        title: '임직원 주소지 동일 가공 거래처(Ghost Vendor) 탐지',
        status: 'Fail', risk: 'High', type: 'Unstructured',
        isNew: true, timestamp: new Date().toISOString(),
        description: 'AI 탐지: 구매처 마스터와 인사 마스터의 주소지를 전수 대조하여 가공 거래처 의심 사례를 식별했습니다.',
        detailedDescription: '새로 업로드된 Vendor_Master와 Employee_Master의 주소 필드를 AI가 NLP 기반으로 정규화하여 대조한 결과, (주)에이비씨상사의 등록 주소가 영업팀 이대리의 거주지와 일치함을 확인했습니다.',
        evidenceUrl: '', violationId: 'V-STP-005'
    },
    violation: {
        id: 'V-STP-005', areaCode: 'STP', riskLevel: 'High',
        controlPoint: '신규 거래처 등록 실사 및 이해상충 방지', violationType: '가공 거래처를 통한 횡령',
        transactionInfo: { id: 'PO-2025-0992', amount: '12,400,000 KRW', date: '2025-11-28', entity: '(주)에이비씨상사' },
        aiAnalysis: '신규 등록된 거래처 (주)에이비씨상사의 주소지가 내부 임직원(이대리)의 주소지와 동일합니다. 해당 거래처로 지난달 1,240만원의 대금이 지급되었으나 실물 입고 기록이 불분명합니다.',
        recommendation: '해당 거래처 지급 즉시 동결 및 해당 임직원 대상 특별 감사 실시.', evidenceType: 'Contract'
    }
  },
  {
    scenario: {
        id: 'SCN-OTC-006', areaCode: 'OTC',
        title: '허위 매출 계상 후 재고 파손(Write-off) 처리 패턴 탐지',
        status: 'Fail', risk: 'High', type: 'Structured',
        isNew: true, timestamp: new Date().toISOString(),
        description: 'AI 탐지: 기말 실적 달성을 위한 허위 매출 후, 기초 재고 조정을 통한 수량 맞추기 정황을 포착했습니다.',
        detailedDescription: '특정 품목(PROD-X)에 대해 대규모 매출이 발생한 직후, 동일 수량이 "파손" 사유로 재고 조정된 로그를 AI가 시계열 분석을 통해 연결했습니다.',
        evidenceUrl: '', violationId: 'V-OTC-006'
    },
    violation: {
        id: 'V-OTC-006', areaCode: 'OTC', riskLevel: 'High',
        controlPoint: '매출 인식 기준 준수 및 재고 실사 통제', violationType: '허위 매출(Round Tripping)',
        transactionInfo: { id: 'SO-2025-1122 / ADJ-99', amount: '56,000,000 KRW', date: '2025-12-01', entity: '마케팅본부 / 물류창고' },
        aiAnalysis: '기말 실적 달성을 위해 12월 1일 가공의 매출 5,600만원을 발생시킨 후, 12월 5일 실물 부족분을 감추기 위해 동일 수량을 파손 처리한 전형적인 분식회계 패턴입니다.',
        recommendation: '관련 담당자 소명 요구 및 재고 실물 실사 전수 실시. 매출 채권 회수 여부 확인 필요.', evidenceType: 'Log File'
    }
  }
];

interface DataUploadProps {
    setActiveView: (view: string) => void;
    onAddScenarioAndViolation: (scenario: Scenario, violation: ViolationDetail) => void;
    onAuditComplete: () => void;
    files: MockUploadFile[];
    setFiles: React.Dispatch<React.SetStateAction<MockUploadFile[]>>;
}

const DataUpload: React.FC<DataUploadProps> = ({ setActiveView, onAddScenarioAndViolation, onAuditComplete, files, setFiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditAreaCode | 'ALL'>('ALL');
  const [viewingFile, setViewingFile] = useState<MockUploadFile | null>(null);
  const [auditStatus, setAuditStatus] = useState<'idle' | 'running' | 'show-discovery' | 'complete'>('idle');
  const [currentDiscovery, setCurrentDiscovery] = useState<typeof AI_DISCOVERY_POOL[0] | null>(null);
  // auditCountRef is no longer strictly used for rotating *new* scenarios to add,
  // but can remain as a general counter if needed.
  const auditCountRef = useRef(parseInt(localStorage.getItem('audit_count') || '0'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Excel': case 'CSV': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'PDF': return <FileText className="w-5 h-5 text-red-600" />;
      case 'LOG': return <Terminal className="w-5 h-5 text-slate-600" />;
      default: return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles: MockUploadFile[] = [];
        for (const fileObj of Array.from(e.target.files)) {
            const file = fileObj as File;
            let type: 'Excel' | 'CSV' | 'PDF' | 'LOG' = 'LOG';
            if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) type = 'Excel';
            else if (file.name.toLowerCase().endsWith('.csv')) type = 'CSV';
            else if (file.name.toLowerCase().endsWith('.pdf')) type = 'PDF';
            const size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            const content = file.type.startsWith('text/') || type === 'CSV' ? await file.text() : "Binary content preview not available.";
            newFiles.push({ id: `file-${Date.now()}-${Math.random()}`, name: file.name, type, size, category: 'FSC', content });
        }
        setFiles(prev => [...newFiles, ...prev]);
    }
  };

  const handleRunAudit = () => {
    setAuditStatus('running');
    setTimeout(() => {
        onAuditComplete(); // This initializes MOCK_SCENARIOS and CRITICAL_VIOLATIONS

        let firstDiscoveryForPopup: typeof AI_DISCOVERY_POOL[0] | null = null;

        // Iterate through all AI_DISCOVERY_POOL items and add them to the App state
        AI_DISCOVERY_POOL.forEach((baseDiscovery, index) => {
            // Generate a *new unique dynamic ID* for each potential discovery instance
            const dynamicSuffix = `-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const newScenarioInstance: Scenario = {
                ...baseDiscovery.scenario,
                id: `${baseDiscovery.scenario.id}${dynamicSuffix}`, // Dynamic ID based on baseDiscovery.scenario.id
                timestamp: new Date().toISOString(),
                isNew: true, // Always mark as new for this run
            };
            const newViolationInstance: ViolationDetail = {
                ...baseDiscovery.violation,
                id: `${baseDiscovery.violation.id}${dynamicSuffix}`, // Dynamic ID based on baseDiscovery.violation.id
            };
            newScenarioInstance.violationId = newViolationInstance.id; // Link them

            // Call App.tsx function to add/update scenario and violation
            onAddScenarioAndViolation(newScenarioInstance, newViolationInstance);

            // For the popup, select the first scenario from the pool to display.
            if (index === 0) {
                firstDiscoveryForPopup = { scenario: newScenarioInstance, violation: newViolationInstance };
            }
        });

        // Set the currentDiscovery for the popup, ensuring it's not null (handles empty AI_DISCOVERY_POOL if it were possible)
        setCurrentDiscovery(firstDiscoveryForPopup || null);

        // auditCountRef can remain for other potential future uses or simple counter, but not for ID generation.
        auditCountRef.current += 1;
        localStorage.setItem('audit_count', auditCountRef.current.toString());

        setAuditStatus('show-discovery');
    }, 2500);
  };

  const handleGoToDashboard = () => {
      setAuditStatus('complete');
      setTimeout(() => setActiveView('dashboard'), 100);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative">
      <AnimatePresence>
        {/* RUNNING OVERLAY */}
        {auditStatus === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex items-center justify-center">
            <div className="text-center text-white p-8 max-w-xl">
                <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-blue-400" />
                <h3 className="text-2xl font-bold">AI 감사 심층 분석 중...</h3>
                <p className="mt-2 text-slate-300">업로드된 <strong>{files.length}개</strong>의 파일을 전수 분석하여 이상 징후를 탐지하고 있습니다.</p>
                <div className="mt-8 space-y-2 text-xs font-mono text-left inline-block bg-black/30 p-5 rounded-xl border border-white/10 w-full">
                    <p className="text-blue-300 animate-pulse">> Scanning {files.length} files in data lake... OK</p>
                    <p className="text-blue-300">> Cross-referencing Unstructured Docs with ERP logs... Processing</p>
                    <p className="text-yellow-400">> AI Forensic Pattern Matching (N-13 series)... Running</p>
                    <p className="text-green-400 font-bold">> ALERT: Potential fraud indicator identified in the latest dataset.</p>
                </div>
            </div>
          </motion.div>
        )}

        {/* DISCOVERY NOTIFICATION POPUP */}
        {auditStatus === 'show-discovery' && currentDiscovery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-500/20">
                    <div className="bg-red-600 p-6 flex items-center gap-4 text-white">
                        <div className="bg-white/20 p-3 rounded-full animate-bounce">
                            <Siren className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">신규 위험 시나리오 자동 탐지</h3>
                            <p className="text-xs opacity-90">AI가 방금 업로드된 데이터에서 잠재적 부정을 식별했습니다.</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{currentDiscovery.scenario.id} / High Risk</span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1 leading-tight">{currentDiscovery.scenario.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed mt-2">{currentDiscovery.scenario.description}</p>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-100">
                            <Sparkles className="w-5 h-5 shrink-0" />
                            <p>이 항목은 <strong>AI 분석 리포트</strong> 및 <strong>감사 보고서</strong>에 즉시 반영되었습니다.</p>
                        </div>
                        <button onClick={handleGoToDashboard} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                            전체 분석 결과 확인하기 (대시보드) <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls,.pdf,.log,.txt" multiple />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">감사 데이터 업로드 (Data Upload)</h2>
          <p className="text-slate-500 mt-1">감사 대상 기간(2024-2025)의 원장, 로그, 비정형 데이터를 분석하여 위험을 탐지합니다.</p>
        </div>
        <button onClick={handleUploadClick} type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">
          <UploadCloud className="w-5 h-5" />
          <span>새 파일 업로드</span>
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">파일명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">유형</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">크기</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-blue-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-lg">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{file.name}</div>
                        <div className="text-xs text-slate-500">{file.category} Data</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{file.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{file.size}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Eye className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                  <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">데이터가 없습니다. 파일을 업로드해주세요.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t-2 border-dashed border-slate-200">
            <button
                onClick={handleRunAudit}
                type="button"
                disabled={files.length === 0 || auditStatus !== 'idle'}
                className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:from-slate-400 disabled:to-slate-500"
            >
                <Sparkles className="w-6 h-6"/>
                <span>AI 감사 실행 ({files.length}개 파일 전수 분석)</span>
                <ArrowRight className="w-6 h-6"/>
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">업로드된 전체 데이터를 분석하여 기존 시나리오 외 숨겨진 위험을 실시간으로 발굴합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;