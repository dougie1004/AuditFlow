
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScenarioManager from './components/ScenarioManager';
import DataUpload from './components/DataUpload';
import CorpCardAudit from './components/CorpCardAudit';
import ProductionForecast from './components/ProductionForecast';
import ProcessMonitoring from './components/ProcessMonitoring';
import AuditManagement from './components/AuditManagement'; // Imported
import Login from './components/Login';
import Reports from './components/Reports';
import AuditReport from './components/AuditReport';
import AIChat from './components/AIChat';
import { Menu, Bell } from 'lucide-react';
import { MOCK_SCENARIOS } from './data/mockData';
import { Scenario } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Centralized State for Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>(MOCK_SCENARIOS);

  const handleAddScenario = (newScenario: Scenario) => {
    setScenarios(prev => [newScenario, ...prev]);
  };

  const newScenarioCount = useMemo(() => scenarios.filter(s => s.isNew).length, [scenarios]);

  const pageTitles: { [key: string]: string } = {
    dashboard: '대시보드',
    'ai-reports': 'AI 분석 리포트',
    'final-report': '감사 보고서',
    'ai-chat': 'AI 어시스턴트',
    'audit-management': '감사 업무 관리', // Added title
    'data-upload': '데이터 업로드',
    'scenario-manager': '시나리오 관리',
    'corp-card-audit': '법인카드 감사',
    'production-forecast': '생산 관리 예측',
    'process-monitoring': '기업 프로세스 모니터링',
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard scenarios={scenarios} />;
      case 'ai-reports':
        return <Reports scenarios={scenarios} />;
      case 'final-report':
        return <AuditReport />;
      case 'ai-chat':
        return <AIChat />;
      case 'audit-management': // Added route
        return <AuditManagement />;
      case 'data-upload':
        return <DataUpload setActiveView={setActiveView} />;
      case 'scenario-manager':
        return <ScenarioManager scenarios={scenarios} onAddScenario={handleAddScenario} />;
      case 'corp-card-audit':
        return <CorpCardAudit />;
      case 'production-forecast':
        return <ProductionForecast />;
      case 'process-monitoring':
        return <ProcessMonitoring />;
      default:
        return <Dashboard scenarios={scenarios} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={(view) => {
          setActiveView(view);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLogout={() => setIsAuthenticated(false)}
      />
      <main className="flex-1 lg:ml-64 h-screen flex flex-col">
        {/* Header for both mobile and desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-800 p-2 -ml-2 lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-base font-bold text-slate-900">{pageTitles[activeView]}</h1>
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-slate-500" />
            {newScenarioCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                {newScenarioCount}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
