import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScenarioList from './components/ScenarioList';
import Reports from './components/Reports';
import AIChat from './components/AIChat';
import AuditReport from './components/AuditReport';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');

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
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 ml-64 h-screen overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;