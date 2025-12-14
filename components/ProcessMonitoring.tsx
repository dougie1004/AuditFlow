import React, { useState } from 'react';
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
  XCircle
} from 'lucide-react';

// --- Mock Data ---

const PROCESS_STEPS = [
  { id: 1, label: '구매 요청 (PR)', icon: ShoppingCart, status: 'normal', time: '0.5h' },
  { id: 2, label: '결재 승인', icon: FileSignature, status: 'delay', time: '24h+' },
  { id: 3, label: '발주 생성 (PO)', icon: PackageCheck, status: 'normal', time: '1.2h' },
  { id: 4, label: '물품 입고', icon: Truck, status: 'normal', time: '4.5h' },
  { id: 5, label: '대금 지급', icon: CreditCard, status: 'normal', time: '2.0h' },
];

interface AnomalyLog {
  id: string;
  time: string;
  process: string;
  type: string;
  risk: string;
  department: string;
  category: 'processed' | 'delayed';
}

const ANOMALY_LOGS: AnomalyLog[] = [
  { id: 'LOG-001', time: '10:42', process: '구매 요청 #PR-2024-001', type: '전결 규정 위반 의심', risk: 'High', department: '구매팀', category: 'delayed' },
  { id: 'LOG-002', time: '11:15', process: '대금 지급 #PAY-992', type: '휴면 계좌로 송금 시도', risk: 'Critical', department: '재무팀', category: 'delayed' },
  { id: 'LOG-003', time: '13:20', process: '입고 처리', type: '발주 수량 대비 초과 입고', risk: 'Low', department: '구매팀', category: 'processed' },
  { id: 'LOG-004', time: '14:05', process: '결재 승인', type: '동일인에 의한 중복 승인', risk: 'Medium', department: '재무팀', category: 'delayed' },
  { id: 'LOG-005', time: '15:30', process: '영업 기회 등록', type: '필수 정보 누락', risk: 'Low', department: '영업팀', category: 'processed' },
  { id: 'LOG-006', time: '16:10', process: '영업 비용 청구', type: '영수증 미첨부', risk: 'Medium', department: '영업팀', category: 'delayed' },
  { id: 'LOG-007', time: '16:45', process: '재무 마감', type: '계정 과목 오분류', risk: 'Low', department: '재무팀', category: 'processed' },
];

const DEPARTMENT_STATS = [
  { name: '구매팀', processed: 145, delayed: 4 },
  { name: '재무팀', processed: 98, delayed: 12 },
  { name: '영업팀', processed: 210, delayed: 2 },
  { name: '인사팀', processed: 45, delayed: 0 },
];

// --- Components ---

const StatsCard = ({ icon: Icon, title, value, subtext, colorClass, textColorClass }: { icon: any, title: string, value: string, subtext?: string, colorClass: string, textColorClass?: string }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={`text-2xl font-bold ${textColorClass || 'text-slate-900'}`}>{value}</h3>
        {subtext && <span className="text-sm font-medium text-slate-400">{subtext}</span>}
      </div>
    </div>
  </div>
);

const ProcessMonitoring: React.FC = () => {
  const [filter, setFilter] = useState<{ dept: string | null; status: 'processed' | 'delayed' | null }>({ dept: null, status: null });

  const handleBarClick = (data: any, status: 'processed' | 'delayed') => {
    // If clicking the same filter, toggle it off
    if (filter.dept === data.name && filter.status === status) {
      setFilter({ dept: null, status: null });
    } else {
      setFilter({ dept: data.name, status });
    }
  };

  const filteredLogs = ANOMALY_LOGS.filter(log => {
    if (filter.dept && log.department !== filter.dept) return false;
    if (filter.status && log.category !== filter.status) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">기업 프로세스 모니터링 (Enterprise Process Monitoring)</h2>
        <p className="text-slate-500 mt-1">핵심 비즈니스 프로세스의 흐름을 실시간으로 추적하고 병목 현상 및 위험을 감지합니다.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="프로세스 가동률" 
          value="98.5%" 
          subtext="정상" 
          icon={Activity} 
          colorClass="bg-blue-500" 
        />
        <StatsCard 
          title="현재 결재 대기" 
          value="14건" 
          subtext="지연 발생" 
          icon={Clock} 
          colorClass="bg-orange-500" 
          textColorClass="text-red-600"
        />
        <StatsCard 
          title="평균 처리 시간" 
          value="4.2h" 
          icon={CheckCircle2} 
          colorClass="bg-emerald-500" 
        />
        <StatsCard 
          title="금일 이상 징후" 
          value="2건" 
          subtext="탐지됨" 
          icon={FileWarning} 
          colorClass="bg-red-500" 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Process Map & Logs (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Process Flow Map */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600"/>
              실시간 구매-결제 프로세스 흐름 (P2P Flow)
            </h3>
            
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-4 px-2 py-6">
              {/* Connecting Line (Desktop) */}
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>

              {PROCESS_STEPS.map((step, index) => {
                const isDelayed = step.status === 'delay';
                const StepIcon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative w-full lg:w-auto z-0">
                     {/* Connecting Arrow for Mobile */}
                     {index > 0 && (
                        <div className="lg:hidden h-8 w-0.5 bg-slate-300 my-1"></div>
                     )}

                    <div className={`
                      flex flex-col items-center justify-center w-full lg:w-40 p-4 rounded-xl border-2 transition-all
                      ${isDelayed 
                        ? 'bg-orange-50 border-orange-200 shadow-md shadow-orange-100' 
                        : 'bg-white border-slate-200 shadow-sm'}
                    `}>
                      <div className={`
                        p-3 rounded-full mb-3
                        ${isDelayed ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}
                      `}>
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 text-center">{step.label}</span>
                      <span className={`text-xs mt-1 font-medium ${isDelayed ? 'text-red-500' : 'text-slate-400'}`}>
                        {isDelayed ? `지연 발생 (${step.time})` : `평균 ${step.time}`}
                      </span>
                      
                      {isDelayed && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                          Delay
                        </div>
                      )}
                    </div>
                    
                    {/* Arrow for Desktop */}
                    {index < PROCESS_STEPS.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 bg-white rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly Logs */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600"/>
                실시간 이상 징후 로그
              </h3>
              <div className="flex items-center gap-2">
                {filter.dept && (
                   <button 
                     onClick={() => setFilter({ dept: null, status: null })}
                     className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors"
                   >
                     <Filter className="w-3 h-3" />
                     {filter.dept} : {filter.status === 'processed' ? '정상' : '지연'}
                     <XCircle className="w-3 h-3 ml-1" />
                   </button>
                )}
                <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded animate-pulse">Live</span>
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
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 font-mono">{log.time}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-600">{log.department}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">{log.process}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{log.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`
                            px-2 py-1 text-xs font-bold rounded-full
                            ${log.risk === 'Critical' ? 'bg-red-100 text-red-700' : 
                              log.risk === 'High' ? 'bg-orange-100 text-orange-700' :
                              log.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-600'}
                          `}>
                            {log.risk}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                            해당 조건에 맞는 이상 징후 로그가 없습니다.
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
              <BarChart data={DEPARTMENT_STATS} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar 
                    dataKey="processed" 
                    name="정상 처리" 
                    stackId="a" 
                    fill="#3b82f6" 
                    barSize={40} 
                    cursor="pointer"
                    onClick={(data) => handleBarClick(data, 'processed')}
                    fillOpacity={filter.status === 'delayed' ? 0.3 : 1}
                />
                <Bar 
                    dataKey="delayed" 
                    name="지연 건수" 
                    stackId="a" 
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40} 
                    cursor="pointer"
                    onClick={(data) => handleBarClick(data, 'delayed')}
                    fillOpacity={filter.status === 'processed' ? 0.3 : 1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800 mb-2">분석 인사이트</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              현재 <span className="font-bold text-blue-600">재무팀</span>에서 결재 대기 건수가 급증하고 있어 전체 프로세스 리드타임에 영향을 주고 있습니다. 병목 구간 해소를 위해 전결 규정 검토가 필요합니다.
              <br/><br/>
              * 차트의 막대를 클릭하여 해당 부서의 로그를 필터링할 수 있습니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProcessMonitoring;