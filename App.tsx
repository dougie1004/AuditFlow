import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScenarioList from './components/ScenarioList';
import Reports from './components/Reports';
import AIChat from './components/AIChat';
import AuditReport from './components/AuditReport';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pageTitles: { [key: string]: string } = {
    dashboard: '대시보드',
    scenarios: '테스트 시나리오',
    reports: '상세 위반 분석',
    'final-report': '감사 보고서',
    'ai-chat': 'AuditFlow AI',
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'scenarios':
        return <ScenarioList />;
      case 'reports':
        return <Reports />;
      case 'final-report':
        return <AuditReport />;
      case 'ai-chat':
        return <AIChat />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={(view) => {
          setActiveView(view);
          setIsSidebarOpen(false); // Close sidebar on mobile when a new view is selected
        }}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="flex-1 lg:ml-64 h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-800 p-2 -ml-2">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-slate-900">{pageTitles[activeView]}</h1>
          <div className="w-6"></div> {/* Spacer to balance the title */}
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;