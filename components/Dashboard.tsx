import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { ShieldAlert, CheckCircle, FileSearch, Activity } from 'lucide-react';
import { AUDIT_AREAS, MOCK_SCENARIOS } from '../data/mockData';

const Dashboard: React.FC = () => {
  const totalScenarios = 90;
  const totalViolations = AUDIT_AREAS.reduce((acc, curr) => acc + curr.violationCount, 0);
  const complianceRate = ((totalScenarios - totalViolations) / totalScenarios * 100).toFixed(1);

  const chartData = AUDIT_AREAS.map(area => ({
    name: area.code,
    위반건수: area.violationCount,
    준수: area.totalScenarios - area.violationCount
  }));

  const StatsCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        <p className={`text-xs mt-2 font-medium ${subtext.includes('+') ? 'text-green-600' : 'text-slate-400'}`}>
          {subtext}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">경영진 감사 대시보드 (Executive Dashboard)</h2>
        <p className="text-slate-500 mt-1">9개 핵심 영역에 대한 내부 통제 및 컴플라이언스 실시간 모니터링</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="종합 통제 준수율" 
          value={`${complianceRate}%`} 
          subtext="전 분기 대비 +2.4%" 
          icon={CheckCircle} 
          color="bg-emerald-500" 
        />
        <StatsCard 
          title="총 적발 건수" 
          value={totalViolations} 
          subtext="13건의 중요 위험 감지됨" 
          icon={ShieldAlert} 
          color="bg-red-500" 
        />
        <StatsCard 
          title="실행된 시나리오" 
          value={totalScenarios} 
          subtext="100% 진단 완료" 
          icon={Activity} 
          color="bg-blue-500" 
        />
        <StatsCard 
          title="비정형 문서 분석" 
          value="4,215" 
          subtext="계약서, 이메일, 규정집 스캔 완료" 
          icon={FileSearch} 
          color="bg-indigo-500" 
        />
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">영역별 위반 현황 (Violations by Area)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="위반건수" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-4">최근 위험 알림</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-80 lg:max-h-none">
            {MOCK_SCENARIOS.filter(s => s.status === 'Fail').slice(0, 5).map(scenario => (
              <div key={scenario.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-red-600 px-2 py-0.5 bg-white rounded border border-red-200">
                    {scenario.areaCode}
                  </span>
                  <span className="text-xs text-slate-400">방금 전</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-2">{scenario.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scenario.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
