import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_CORP_CARD_TRANSACTIONS } from '../data/mockData';
import { CorpCardTransaction, AnomalyType } from '../types';
import { MapPin, Briefcase, Home, AlertTriangle, Users, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type AuditMode = 'individual' | 'department';
type Department = '영업' | 'R&D' | '마케팅';

const DEPARTMENTS: Department[] = ['영업', 'R&D', '마케팅'];

// FIX: The 'null' key is invalid in an object literal and the type has been adjusted to Exclude<AnomalyType, null>.
const ANOMALY_COLORS: { [key in Exclude<AnomalyType, null>]: string } = {
  '자택 근처 사용': '#ef4444',
  '주말/심야 사용': '#f97316',
  '한도 초과': '#a855f7',
  '쪼개기 결제 의심': '#ec4899',
  '유흥업소 사용 의심': '#8b5cf6',
};

// --- Department View Component ---
const DepartmentDashboard: React.FC<{ department: Department }> = ({ department }) => {
  const deptTransactions = useMemo(() => 
    MOCK_CORP_CARD_TRANSACTIONS.filter(t => t.employee.department === department), 
    [department]
  );

  const totalSpent = deptTransactions.reduce((sum, t) => sum + t.amount, 0);
  const anomalyCount = deptTransactions.filter(t => t.anomaly).length;

  const anomalyData = useMemo(() => {
    const counts = deptTransactions.reduce((acc, t) => {
      if (t.anomaly) {
        acc[t.anomaly] = (acc[t.anomaly] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
    
    return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
  }, [deptTransactions]);
  
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
          <p className="text-2xl font-bold">{deptTransactions.length}건</p>
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
            <BarChart data={anomalyData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 50 }}>
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
          <div className="flex items-center justify-center h-full text-slate-500">이상 거래가 없습니다.</div>
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

  useEffect(() => {
    setHomeAddress(selectedTxn.employee.homeAddress);
  }, [selectedTxn]);

  const transactionsToList = useMemo(() => {
    if (auditMode === 'department') {
      return MOCK_CORP_CARD_TRANSACTIONS.filter(t => t.employee.department === selectedDept);
    }
    // In individual mode, show all transactions to allow selection
    return MOCK_CORP_CARD_TRANSACTIONS;
  }, [auditMode, selectedDept]);
  
  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left Panel - List & Controls */}
      <div className="w-full md:w-1/3 h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-4 border-b">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setAuditMode('individual')} className={`flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md ${auditMode === 'individual' ? 'bg-white shadow' : ''}`}><User className="w-4 h-4"/> 직원별</button>
            <button onClick={() => setAuditMode('department')} className={`flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md ${auditMode === 'department' ? 'bg-white shadow' : ''}`}><Users className="w-4 h-4"/> 부서별</button>
          </div>
        </div>

        {auditMode === 'individual' ? (
          <div className="p-4 border-b">
            <h2 className="font-bold">감사 대상 임직원 설정</h2>
            <div className="mt-2 space-y-2">
              <input type="text" placeholder="사원명" value={selectedTxn.employee.name} readOnly className="w-full p-2 border rounded bg-slate-100"/>
              <input type="text" placeholder="사번" value={selectedTxn.employee.id} readOnly className="w-full p-2 border rounded bg-slate-100"/>
              <input type="text" placeholder="거주지 주소" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} className="w-full p-2 border rounded bg-white"/>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b">
            <h2 className="font-bold">감사 대상 부서 선택</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DEPARTMENTS.map(dept => (
                 <button key={dept} onClick={() => setSelectedDept(dept)} className={`text-sm p-2 rounded-md border ${selectedDept === dept ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}>{dept}팀</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <h3 className="font-bold p-4 sticky top-0 bg-white border-b">
            {auditMode === 'individual' ? 'AI 탐지 이상 거래 내역' : `${selectedDept}팀 거래 내역`}
          </h3>
          {transactionsToList.map(txn => (
            <button key={txn.id} onClick={() => setSelectedTxn(txn)} className={`w-full text-left p-4 border-b hover:bg-slate-50 ${selectedTxn.id === txn.id && auditMode === 'individual' ? 'bg-blue-50' : ''}`}>
              <div className="flex justify-between items-center">
                <p className="font-semibold text-sm">{txn.employee.name} - {txn.merchant}</p>
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

      {/* Right Panel - Map or Dashboard */}
      <div className="w-full md:w-2/3 h-full">
        {auditMode === 'individual' ? (
          <div className="w-full h-full bg-slate-100 p-4 flex items-center justify-center">
            <div className="w-full h-full max-w-4xl max-h-[80vh] bg-slate-300 rounded-lg relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url(https://www.openstreetmap.org/assets/map-bg-61d2d79391cf8e7925000a29aa24100b.png)' }}></div>
              <div className="absolute" style={{ top: '20%', left: '60%'}}>
                  <div className="flex flex-col items-center"><div className="p-2 bg-blue-600 rounded-full shadow-lg"><Briefcase className="w-5 h-5 text-white" /></div><span className="mt-1 text-xs font-bold bg-white/80 px-2 py-0.5 rounded">회사</span></div>
              </div>
              <div className="absolute" style={{ top: '50%', left: '30%'}}>
                  <div className="flex flex-col items-center"><div className="p-2 bg-green-600 rounded-full shadow-lg"><Home className="w-5 h-5 text-white" /></div><span className="mt-1 text-xs font-bold bg-white/80 px-2 py-0.5 rounded">자택</span></div>
              </div>
              <div className="absolute w-48 h-48 bg-red-500/10 border-2 border-dashed border-red-500/50 rounded-full animate-pulse" style={{ top: '50%', left: '30%', transform: 'translate(-50%, -50%)' }}></div>
              <div className="absolute transition-all duration-500" style={{ top: selectedTxn.anomaly === '자택 근처 사용' ? '45%' : '70%', left: selectedTxn.anomaly === '자택 근처 사용' ? '35%' : '55%' }}>
                  <div className="flex flex-col items-center"><div className={`p-2 rounded-full shadow-lg ${selectedTxn.anomaly ? 'bg-red-600' : 'bg-gray-600'}`}><MapPin className="w-5 h-5 text-white" /></div><span className="mt-1 text-xs text-center font-bold bg-white/80 px-2 py-0.5 rounded w-24 truncate">{selectedTxn.merchant}</span></div>
              </div>
              <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs">
                  <h4 className="font-bold">{selectedTxn.merchant}</h4>
                  <p className="text-sm text-slate-600">{new Date(selectedTxn.timestamp).toLocaleString('ko-KR')}</p>
                  <p className="text-lg font-bold mt-2">{(selectedTxn.amount).toLocaleString()} 원</p>
                  {selectedTxn.anomaly && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <div><p className="font-bold">이상 거래 감지</p><p className="text-xs">{selectedTxn.anomaly}</p></div>
                      </div>
                  )}
              </div>
            </div>
          </div>
        ) : (
          <DepartmentDashboard department={selectedDept} />
        )}
      </div>
    </div>
  );
};

export default CorpCardAudit;