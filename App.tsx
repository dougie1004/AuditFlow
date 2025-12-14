import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScenarioManager from './components/ScenarioManager';
import DataUpload from './components/DataUpload';
import CorpCardAudit from './components/CorpCardAudit';
import ProductionForecast from './components/ProductionForecast';
import Login from './components/Login';
import Reports from './components/Reports';
import AuditReport from './components/AuditReport';
import AIChat from './components/AIChat';
import { Menu, Bell } from 'lucide-react';
import { MOCK_SCENARIOS } from './data/mockData';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const newScenarioCount = useMemo(() => MOCK_SCENARIOS.filter(s => s.isNew).length, []);

  const pageTitles: { [key: string]: string } = {
    dashboard: '대시보드',
    'ai-reports': 'AI 분석 리포트',
    'final-report': '감사 보고서',
    'ai-chat': 'AI 어시스턴트',
    'data-upload': '데이터 업로드',
    'scenario-manager': '시나리오 관리',
    'corp-card-audit': '법인카드 감사',
    'production-forecast': '생산 관리 예측',
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'ai-reports':
        return <Reports />;
      case 'final-report':
        return <AuditReport />;
      case 'ai-chat':
        return <AIChat />;
      case 'data-upload':
        return <DataUpload setActiveView={setActiveView} />;
      case 'scenario-manager':
        return <ScenarioManager />;
      case 'corp-card-audit':
        return <CorpCardAudit />;
      case 'production-forecast':
        return <ProductionForecast />;
      default:
        return <Dashboard />;
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