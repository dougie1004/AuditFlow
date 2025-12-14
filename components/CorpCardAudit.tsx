
import React, { useState, useMemo } from 'react';
import { MOCK_CORP_CARD_TRANSACTIONS } from '../data/mockData';
import { CorpCardTransaction, AnomalyType } from '../types';
import { AlertTriangle, Users, User, Filter, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type AuditMode = 'individual' | 'department';
type Department = '영업' | 'R&D' | '마케팅';

const DEPARTMENTS: Department[] = ['영업', 'R&D', '마케팅'];

const ANOMALY_COLORS: { [key in Exclude<AnomalyType, null>]: string } = {
  '자택 근처 사용': '#ef4444',
  '주말/심야 사용': '#f97316',
  '한도 초과': '#a855f7',
  '쪼개기 결제 의심': '#ec4899',
  '유흥업소 사용 의심': '#8b5cf6',
};
const ANOMALY_TYPES = Object.keys(ANOMALY_COLORS) as Exclude<AnomalyType, null>[];

// --- Department View Component ---
const DepartmentDashboard: React.FC<{ department: Department, transactions: CorpCardTransaction[] }> = ({ department, transactions }) => {

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const anomalyCount = transactions.filter(t => t.anomaly).length;

  const anomalyData = useMemo(() => {
    const counts = transactions.reduce((acc, t) => {
      if (t.anomaly) {
        acc[t.anomaly] = (acc[t.anomaly] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
    
    return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
  }, [transactions]);
  
  return (
    <div className="w-full h-full bg-slate-50 p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{department}팀 법인카드 분석</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-slate-500">총 사용 금액</p>
          <p className="text-2xl font-bold">{(totalSpent).toLocaleString()}원</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-slate-500">총 거래 건수</p>
          <p className="text-2xl font-bold">{transactions.length}건</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 bg-red-50">
          <p className="text-sm text-red-600">AI 탐지 이상건수</p>
          <p className="text-2xl font-bold text-red-700">{anomalyCount}건</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border h-80">
        <h3 className="font-bold mb-4 text-slate-800">이상 거래 유형 분석</h3>
        {anomalyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={anomalyData} layout="vertical" margin={{ top: 0, right: 20, bottom: 20, left: 60 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="count" barSize={20}>
                {anomalyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ANOMALY_COLORS[entry.name as Exclude<AnomalyType, null>] || '#ccc'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">선택된 필터에 해당하는 이상 거래가 없습니다.</div>
        )}
      </div>
    </div>
  );
};


const CorpCardAudit: React.FC = () => {
  const [auditMode, setAuditMode] = useState<AuditMode>('individual');
  const [selectedDept, setSelectedDept] = useState<Department>('영업');
  const [selectedTxn, setSelectedTxn] = useState<CorpCardTransaction>(MOCK_CORP_CARD_TRANSACTIONS[0]);
  const [homeAddress, setHomeAddress] = useState(selectedTxn.employee.homeAddress);
  const [selectedAnomalies, setSelectedAnomalies] = useState<Exclude<AnomalyType, null>[]>([]);
  const [transactions] = useState<CorpCardTransaction[]>(MOCK_CORP_CARD_TRANSACTIONS);

  const handleAnomalyFilterToggle = (anomaly: Exclude<AnomalyType, null>) => {
    setSelectedAnomalies(prev => {
      if (prev.includes(anomaly)) {
        return prev.filter(a => a !== anomaly); // Deselect
      } else {
        return [...prev, anomaly]; // Select
      }
    });
  };

  const transactionsToList = useMemo(() => {
    if (auditMode === 'department') {
      let deptTransactions = transactions.filter(t => t.employee.department === selectedDept);
      if (selectedAnomalies.length > 0) {
        deptTransactions = deptTransactions.filter(t => t.anomaly && selectedAnomalies.includes(t.anomaly));
      }
      return deptTransactions;
    }
    // For individual mode, show all transactions in the list for the current employee
    return transactions.filter(t => t.employee.id === selectedTxn.employee.id);
  }, [auditMode, selectedDept, selectedAnomalies, transactions, selectedTxn.employee.id]);

  // When selecting a new transaction, also update the home address input
  const handleSelectTransaction = (txn: CorpCardTransaction) => {
    setSelectedTxn(txn);
    setHomeAddress(txn.employee.homeAddress);
  }
  
  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left Panel - List & Controls */}
      <div className="w-full md:w-1/3 h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 border-b">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => { setAuditMode('individual'); setSelectedAnomalies([]); }} className={`flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md ${auditMode === 'individual' ? 'bg-white shadow' : ''}`}><User className="w-4 h-4"/> 직원별</button>
            <button onClick={() => { setAuditMode('department'); }} className={`flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md ${auditMode === 'department' ? 'bg-white shadow' : ''}`}><Users className="w-4 h-4"/> 부서별</button>
          </div>
        </div>

        {auditMode === 'individual' ? (
          <div className="p-4 border-b">
            <h2 className="font-bold">감사 대상 임직원 설정</h2>
            <div className="mt-2 space-y-2">
              <input type="text" placeholder="사원명" value={selectedTxn.employee.name} readOnly className="w-full p-2 border rounded bg-slate-100"/>
              <input type="text" placeholder="사번" value={selectedTxn.employee.id} readOnly className="w-full p-2 border rounded bg-slate-100"/>
              <input type="text" placeholder="거주지 주소 (예: 강남구)" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} className="w-full p-2 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"/>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b">
              <h2 className="font-bold">감사 대상 부서 선택</h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DEPARTMENTS.map(dept => (
                   <button key={dept} onClick={() => setSelectedDept(dept)} className={`text-sm p-2 rounded-md border ${selectedDept === dept ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}>{dept}팀</button>
                ))}
              </div>
            </div>
            <div className="p-4 border-b">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800"><Filter className="w-4 h-4 text-slate-500" />이상 거래 유형 필터</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSelectedAnomalies([])}
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedAnomalies.length === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  전체
                </button>
                {ANOMALY_TYPES.map(anomaly => (
                  <button 
                    key={anomaly} 
                    onClick={() => handleAnomalyFilterToggle(anomaly)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${selectedAnomalies.includes(anomaly) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {anomaly}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex-1 overflow-y-auto">
          <h3 className="font-bold p-4 sticky top-0 bg-white border-b">
            {auditMode === 'individual' ? `${selectedTxn.employee.name}님 거래 내역` : `${selectedDept}팀 거래 내역`}
          </h3>
          {transactionsToList.map(txn => (
            <button key={txn.id} onClick={() => handleSelectTransaction(txn)} className={`w-full text-left p-4 border-b hover:bg-slate-50 ${selectedTxn.id === txn.id ? 'bg-blue-50' : ''}`}>
              <div className="flex justify-between items-center">
                <p className="font-semibold text-sm">{auditMode === 'individual' ? txn.merchant : `${txn.employee.name} - ${txn.merchant}`}</p>
                <p className="font-bold text-sm">{(txn.amount).toLocaleString()}원</p>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                <span>{new Date(txn.timestamp).toLocaleString('ko-KR')}</span>
                {txn.anomaly && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3 h-3"/>{txn.anomaly}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Map Placeholder */}
      <div className="w-full md:w-2/3 h-full relative overflow-hidden bg-slate-200">
        {auditMode === 'individual' ? (
          <>
            {/* Blurred Map Background */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80")', // Generic city map-like image
                filter: 'blur(8px)',
                transform: 'scale(1.1)' // Slight scale to hide blurred edges
              }}
            />
            
            {/* Overlay Message */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white max-w-md text-center">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Google Map API 연동 필요</h3>
                <p className="text-slate-600 mb-6">
                  지도 서비스를 사용하기 위해서는 Google Map API 키 설정이 필요합니다.<br/>
                  <span className="text-xs text-slate-500">(현재 라이선스 문제로 지도가 비활성화되었습니다)</span>
                </p>
                <div className="bg-slate-100 rounded-lg p-3 text-left">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500">거래 정보 미리보기</span>
                    <span className="text-xs text-blue-600 font-bold">{selectedTxn.merchant}</span>
                  </div>
                   <div className="space-y-1">
                      <p className="text-xs text-slate-600"><span className="font-semibold">주소:</span> {selectedTxn.location.address}</p>
                      <p className="text-xs text-slate-600"><span className="font-semibold">금액:</span> {(selectedTxn.amount).toLocaleString()}원</p>
                      {selectedTxn.anomaly && (
                         <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                           <AlertTriangle className="w-3 h-3"/> {selectedTxn.anomaly}
                         </p>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <DepartmentDashboard department={selectedDept} transactions={transactionsToList}/>
        )}
      </div>
    </div>
  );
};

export default CorpCardAudit;
