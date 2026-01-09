
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ShieldAlert, CheckCircle, FileSearch, Activity, UploadCloud, Sparkles } from 'lucide-react';
import { AUDIT_AREAS } from '../data/mockData';
import { Scenario } from '../types';

interface DashboardProps {
  scenarios: Scenario[];
  isAuditComplete: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ scenarios, isAuditComplete }) => {
  // --- Empty State View ---
  if (!isAuditComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-slate-50">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 max-w-sm sm:max-w-md md:max-w-2xl w-full">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">감사 데이터가 없습니다.</h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 mb-6 sm:mb-8 leading-relaxed">
            AI 감사를 시작하려면 감사 대상 기간(최근 2년)의 데이터를 업로드해주세요.<br />
            ERP 원장, 규정 문서, 이메일 로그 등을 분석하여 잠재적 위험을 탐지합니다.
          </p>
          <button className="px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 sm:gap-3 mx-auto text-base sm:text-lg pointer-events-none opacity-50">
            <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
            데이터 업로드 메뉴로 이동하여 시작
          </button>
          <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4">* 좌측 메뉴의 '데이터 업로드' 탭을 이용해주세요.</p>
        </div>
      </div>
    );
  }

  // --- Populated View ---
  const totalScenarios = scenarios.length;
  const totalViolations = scenarios.filter(s => s.status === 'Fail').length;
  const complianceRate = totalScenarios > 0
    ? ((totalScenarios - totalViolations) / totalScenarios * 100).toFixed(1)
    : '100.0';

  const chartData = AUDIT_AREAS.map(area => {
    const areaScenarios = scenarios.filter(s => s.areaCode === area.code);
    const failCount = areaScenarios.filter(s => s.status === 'Fail').length;
    return {
      name: area.code,
      위반건수: failCount,
      준수: areaScenarios.length - failCount
    };
  });

  // Sort alerts: AI-discovered (isNew) first, then by timestamp
  const recentAlerts = useMemo(() => {
    return [...scenarios]
      .filter(s => s.status === 'Fail')
      .sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 5);
  }, [scenarios]);

  const StatsCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{value}</h3>
        <p className={`text-[10px] sm:text-xs mt-2 font-medium ${subtext.includes('+') ? 'text-green-600' : 'text-slate-400'}`}>
          {subtext}
        </p>
      </div>
      <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="block">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">경영진 감사 대시보드 (Executive Dashboard)</h2>
        <p className="text-sm sm:text-base text-slate-500 mt-1">최근 2년(2024-2025) 데이터에 대한 내부 통제 및 컴플라이언스 모니터링 결과</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
          subtext={`${scenarios.filter(s => s.isNew).length}건의 신규 이슈 포함`}
          icon={ShieldAlert}
          color="bg-red-500"
        />
        <StatsCard
          title="실행된 시나리오"
          value={totalScenarios}
          subtext="AI 자동 발굴 시나리오 포함"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">영역별 위반 현황 (Violations by Area)</h3>
          <div className="h-60 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Bar dataKey="위반건수" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            최근 위험 알림
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 sm:space-y-4 max-h-[300px] lg:max-h-none">
            {recentAlerts.map(scenario => (
              <div
                key={scenario.id}
                className={`p-3 rounded-lg border transition-all ${scenario.isNew
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100 shadow-sm animate-in fade-in slide-in-from-right-2'
                  : 'bg-red-50 border-red-100'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border ${scenario.isNew ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-red-600 border-red-200'
                      }`}>
                      {scenario.areaCode}
                    </span>
                    {scenario.isNew && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> NEW
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400">방금 전</span>
                </div>
                <p className={`text-sm font-bold mt-2 ${scenario.isNew ? 'text-blue-900' : 'text-slate-800'}`}>
                  {scenario.title}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scenario.description}</p>
                {scenario.isNew && (
                  <div className="mt-2 pt-2 border-t border-blue-100 flex justify-end">
                    <span className="text-[10px] font-bold text-blue-600">AI 분석 데이터 기반 발굴</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;