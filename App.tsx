
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScenarioManager from './components/ScenarioManager';
import DataUpload from './components/DataUpload';
import CorpCardAudit from './components/CorpCardAudit';
import ProductionForecast from './components/ProductionForecast';
import ProcessMonitoring from './components/ProcessMonitoring';
import AuditManagement from './components/AuditManagement';
import AuditTaskManager from './components/AuditTaskManager'; 
import Login from './components/Login';
import Reports from './components/Reports';
import AuditReport from './components/AuditReport';
import AIChat from './components/AIChat';
import { Menu, Bell } from 'lucide-react';
import { MOCK_SCENARIOS, CRITICAL_VIOLATIONS } from './data/mockData';
import { MOCK_UPLOAD_FILES } from './data/mockUploadData';
import { Scenario, ViolationDetail, MockUploadFile } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Clean Slate: Initial state should be empty for a fresh demo
  const [isAuditComplete, setIsAuditComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<MockUploadFile[]>([]); // Start empty
  const [scenarios, setScenarios] = useState<Scenario[]>([]); // Start empty
  const [violations, setViolations] = useState<ViolationDetail[]>([]); // Start empty

  // Reset localStorage on initial load for a clean demo experience
  useEffect(() => {
    localStorage.removeItem('audit_count');
    localStorage.removeItem('google_maps_api_key');
    // For a more complete reset, one might clear other relevant local storage items here
  }, []);

  // Improved: Merge baseline with existing 'new' findings to prevent data loss
  const handleAuditComplete = () => {
    setIsAuditComplete(true);
    
    setScenarios(prev => {
      // Keep ALL scenarios that were previously marked as isNew (from chat or prior upload)
      const existingNewScenarios = prev.filter(s => s.isNew);
      
      // Filter out only baseline IDs from the 'new' list to prevent identity conflicts if any
      const baselineIds = new Set(MOCK_SCENARIOS.map(s => s.id));
      const filteredExistingNew = existingNewScenarios.filter(s => !baselineIds.has(s.id));
      
      // Return combination: Baseline (90) + All AI-discovered ones
      return [...MOCK_SCENARIOS, ...filteredExistingNew];
    });

    setViolations(prev => {
        // Keep existing non-baseline violations
        const baselineViolationIds = new Set(CRITICAL_VIOLATIONS.map(v => v.id));
        const existingNewViolations = prev.filter(v => !baselineViolationIds.has(v.id));
        return [...CRITICAL_VIOLATIONS, ...existingNewViolations];
    });
  };

  const handleAddScenario = (newScenario: Scenario) => {
    setScenarios(prev => {
      // For manually added scenarios, just check exact ID
      if (prev.some(s => s.id === newScenario.id)) return prev;
      return [newScenario, ...prev];
    });
  };

  const handleAddScenarioAndViolation = (newScenario: Scenario, newViolation: ViolationDetail) => {
    // Determine the base ID of the scenario (e.g., 'SCN-SEC-004' from 'SCN-SEC-004-TIMESTAMP')
    // Assumes base IDs from AI_DISCOVERY_POOL do not contain further hyphens within their core identifier.
    // e.g., 'SCN-SEC-004' is split as ['SCN', 'SEC', '004']
    const baseScenarioIdPrefix = newScenario.id.split('-').slice(0, 3).join('-'); 
    const baseViolationIdPrefix = newViolation.id.split('-').slice(0, 3).join('-'); 

    setScenarios(prev => {
        const existingScenarioIndex = prev.findIndex(s => s.id.startsWith(baseScenarioIdPrefix) && s.isNew);
        if (existingScenarioIndex > -1) {
            // Update the existing scenario with new details, keeping its original dynamic ID if it already had one.
            // This prevents adding a new card for the same "type" of AI discovery.
            const updatedScenario = { ...newScenario, id: prev[existingScenarioIndex].id }; 
            return prev.map((s, idx) => idx === existingScenarioIndex ? updatedScenario : s);
        }
        return [newScenario, ...prev]; // Add if it's truly a new base type or first discovery
    });
    
    setViolations(prev => {
        const existingViolationIndex = prev.findIndex(v => v.id.startsWith(baseViolationIdPrefix) && v.areaCode === newViolation.areaCode);
        if (existingViolationIndex > -1) {
            // Update the existing violation with new details, preserving its original dynamic ID.
            const updatedViolation = { ...newViolation, id: prev[existingViolationIndex].id }; 
            return prev.map((v, idx) => idx === existingViolationIndex ? updatedViolation : v);
        }
        return [...prev, newViolation]; // Add if truly new
    });
  };

  const newScenarioCount = useMemo(() => scenarios.filter(s => s.isNew).length, [scenarios]);

  const pageTitles: { [key: string]: string } = {
    dashboard: '대시보드',
    'ai-reports': 'AI 분석 리포트',
    'final-report': '감사 보고서',
    'ai-chat': 'AI 어시스턴트',
    'audit-management': '감사 업무 관리',
    'audit-task-manager': '감사 이슈 및 제보',
    'data-upload': '데이터 업로드',
    'scenario-manager': '시나리오 관리',
    'corp-card-audit': '법인카드 감사',
    'production-forecast': '생산 관리 예측',
    'process-monitoring': '기업 프로세스 모니터링',
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard scenarios={scenarios} isAuditComplete={isAuditComplete} />;
      case 'ai-reports':
        return <Reports scenarios={scenarios} violations={violations} uploadedFiles={uploadedFiles} />; // Pass uploadedFiles
      case 'final-report':
        return <AuditReport scenarios={scenarios} violations={violations} isAuditComplete={isAuditComplete} uploadedFiles={uploadedFiles} />; // Pass uploadedFiles
      case 'ai-chat':
        return <AIChat onAddScenario={handleAddScenario} onAddScenarioAndViolation={handleAddScenarioAndViolation} uploadedFiles={uploadedFiles} />; // Pass uploadedFiles
      case 'audit-management':
        return <AuditManagement />;
      case 'audit-task-manager':
        return <AuditTaskManager />;
      case 'data-upload':
        return (
          <DataUpload 
            setActiveView={setActiveView} 
            onAddScenarioAndViolation={handleAddScenarioAndViolation} 
            onAuditComplete={handleAuditComplete}
            files={uploadedFiles}
            setFiles={setUploadedFiles} 
          />
        );
      case 'scenario-manager':
        return <ScenarioManager scenarios={scenarios} onAddScenario={handleAddScenario} />;
      case 'corp-card-audit':
        return <CorpCardAudit isAuditComplete={isAuditComplete} />;
      case 'production-forecast':
        return <ProductionForecast />;
      case 'process-monitoring':
        return <ProcessMonitoring />;
      default:
        return <Dashboard scenarios={scenarios} isAuditComplete={isAuditComplete} />;
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
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-800 p-2 -ml-2 lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-base md:text-lg font-bold text-slate-900">{pageTitles[activeView]}</h1>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
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
