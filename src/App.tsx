import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import {
  Menu, X, LayoutDashboard, Database, ShieldCheck,
  Activity, CreditCard, MessageSquare, FileText, BrainCircuit,
  LogOut, CheckCircle2, ChevronDown, TrendingUp, Layers, Box, BookOpen, ListChecks, Cpu, Settings
} from "lucide-react";

import { AuditProvider } from "./context/AuditContext";
import { useAuthStore } from "./store/useAuthStore";
import SetupWizard from "./components/SetupWizard";

import auditflowLogo from "./assets/auditflow_logo.png";
import insightrixLogo from "./assets/insightrix_logo.png";
import { safeInvoke } from "./lib/tauri-bridge";

// 페이지 컴포넌트 임포트
import Dashboard from "./pages/Dashboard";
import DataImport from "./pages/DataUpload";
import AuditWorkspace from "./pages/AuditWorkspace";
import ProductionMonitor from "./pages/ProductionMonitor";
import KnowledgeBase from './pages/KnowledgeBase';
import CorpCardAudit from "./pages/CorpCardAudit";
import AIAssistant from "./pages/AIAssistant";
import AuditReport from "./pages/AuditReport";
import AuditTask from "./pages/AuditTask";
import Login from "./pages/Login";
import RemediationDashboard from "./pages/RemediationDashboard";
import ExecutiveAdmin from "./pages/ExecutiveAdmin";
import RiskHeatmap from "./pages/RiskHeatmap";
import ProjectDetail from "./pages/ProjectDetail";
import AuditHistory from "./pages/AuditHistory"; // Import History
import StagingArea from "./pages/StagingArea";
import AIAnalysisReport from "./components/AIAnalysisReport";
import ExpertConsole from "./pages/ExpertConsole";
import EntityTimeline from "./pages/EntityTimeline";
import FluxAnalysis from "./pages/FluxAnalysis";
import ScenarioManager from "./pages/ScenarioManager";

// Debug Pages
import AuditLifecycle from "./pages/debug/AuditLifecycle";

import { AppConfig } from "./types";
import { isTauri } from "./lib/tauri-bridge";

// [Context] 전역 상태 관리 (인증 및 프로젝트 스코프)
interface AppContextType {
  user: { tier: string } | null;
  activeProject: string | null;
  setActiveProject: (id: string | null) => void;
  logout: () => void;
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  apiEndpoint: 'https://api.insightrix.ai.kr/v1',
  enableAi: true,
  userTier: 'Pro'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

export default function App() {
  const { isRegistered, checkRegistration, isLoading: isAuthLoading } = useAuthStore();
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    checkRegistration();
    
    try {
      const saved = localStorage.getItem('auditflow_config');
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.warn("Failed to load config, using defaults", e);
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  const updateConfig = (patch: Partial<AppConfig>) => {
    const newConfig = { ...config, ...patch };
    setConfig(newConfig);
    localStorage.setItem('auditflow_config', JSON.stringify(newConfig));
  };

  // 전역 에러 리스너
  useEffect(() => {
    const handleError = (e: any) => {
      alert(`[SYSTEM ALERT] ${e.detail}`);
    };
    window.addEventListener('app-error', handleError as any);
    return () => window.removeEventListener('app-error', handleError as any);
  }, []);

  if (isAuthLoading) {
    return (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Initializing Core...</span>
            </div>
        </div>
    );
  }

  if (!isRegistered) {
    return (
      <AppContext.Provider value={{ user: null, activeProject, setActiveProject, logout: () => {}, config, updateConfig }}>
        <AuditProvider>
          <SetupWizard />
        </AuditProvider>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ user: { tier: config.userTier }, activeProject, setActiveProject, logout: () => {}, config, updateConfig }}>
      <AuditProvider>
        <Router>
          <Routes>
            <Route path="/*" element={<Layout />} />
          </Routes>
        </Router>
      </AuditProvider>
    </AppContext.Provider>
  );
}

function Layout() {
  const { user, activeProject, setActiveProject, logout } = useApp();
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      if (width > 1024) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0B1221", flexDirection: isMobile ? "column" : "row" }}>

      {/* 모바일 상단 바 */}
      {isMobile && (
        <div style={{ padding: "8px 20px", background: "#0f172a", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 200, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ background: "white", padding: "6px 10px", borderRadius: "10px" }}>
            <img src={auditflowLogo as any} alt="AuditFlow" style={{ height: "24px", width: "auto", display: "block", objectFit: "contain" }} />
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ background: "none", border: "none", color: "white" }}>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      )}

      {/* 사이드바 */}
      <aside style={{
        width: isMobile ? "100%" : "280px",
        background: "#080E1A",
        color: "#94a3b8",
        display: isSidebarOpen ? "block" : "none",
        padding: "32px 20px",
        position: isMobile ? "fixed" : "relative",
        top: isMobile ? "56px" : 0,
        height: isMobile ? "calc(100vh - 56px)" : "100vh",
        zIndex: 150,
        borderRight: "1px solid rgba(255,255,255,0.1)",
        overflowY: "auto"
      }}>
        {!isMobile && (
          <div style={{ padding: "0 12px 40px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer', background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "90px", overflow: "hidden" }}
            >
              <img src={auditflowLogo as any} alt="AuditFlow" style={{ width: "160%", height: "160%", objectFit: "contain", display: "block", transform: "scale(1.1)", filter: "brightness(1.2)" }} />
            </div>
            <div className="mt-4 px-1 flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${user?.tier === 'Enterprise' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                {user?.tier} PLAN
              </div>
              <button onClick={logout} className="ml-auto text-slate-500 hover:text-white transition-colors" title="로그아웃"><LogOut size={14} /></button>
            </div>
          </div>
        )}

        {/* [Scope Selector] Current Audit Project */}
        <div className="mb-10 px-2 mt-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 opacity-50">Active Audit Context</p>
          <div
            onClick={() => navigate('/portfolio')}
            className={`p-5 rounded-[22px] border cursor-pointer transition-all duration-300 ${activeProject ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border-blue-500/30 text-white shadow-xl shadow-blue-950/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${activeProject ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                <FileText size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight opacity-70">활성 감사 컨텍스트 (Active)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black truncate max-w-[150px] tracking-tight">{activeProject || '전사 통합 감사 (Whole Company)'}</span>
              {activeProject ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("현재 활성 감사 컨텍스트를 해제하시겠습니까?")) {
                      setActiveProject(null);
                    }
                  }}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  title="컨텍스트 해제"
                >
                  <X size={14} className="opacity-60 hover:opacity-100 hover:text-rose-400" />
                </div>
              ) : (
                <ChevronDown size={14} className="opacity-40" />
              )}
            </div>
          </div>
          {!activeProject && location.pathname !== '/tasks' && (
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[9px] text-blue-400 font-bold tracking-tight">프로젝트를 선택하여 인사이트를 확인하세요</p>
            </div>
          )}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Command & Control</p>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="종합 감사 대시보드" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Intelligent Layer</p>
          <NavItem to="/import" icon={<Database size={18} />} label="감사 데이터 업로드" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/workspace" icon={<Layers size={18} />} label="감사 실행 워크스페이스" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/ai" icon={<MessageSquare size={18} />} label="AuditFlow AI 어시스턴트" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/flux-analysis" icon={<BrainCircuit size={18} />} label="Flux (시계열 변화 분석)" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Management</p>
          <NavItem to="/portfolio" icon={<FileText size={18} />} label="감사 프로젝트 관리" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/report" icon={<FileText size={18} />} label="감사 결론 및 보고서" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/scenarios" icon={<Activity size={18} />} label="감사 시나리오 관리" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />

          <div className="mt-8 pt-4 border-t border-slate-800">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 px-4">System Admin</p>
            <div
              onClick={async () => {
                const status = await safeInvoke<string>('get_gemini_api_key').catch(() => "미설정");
                const newKey = prompt(`Gemini API Key를 설정합니다.\n현재: ${status}\n\n새 Key를 입력하세요 (취소 시 기존 유지):`, "");
                if (newKey !== null && newKey.trim() !== "") {
                  try {
                    await safeInvoke('set_gemini_api_key', { key: newKey.trim() });
                    alert("API Key가 성공적으로 저장되었습니다.");
                  } catch (e) {
                    alert("저장 중 오류 발생: " + e);
                  }
                }
              }}
              className="flex items-center gap-[14px] px-4 py-3 rounded-xl hover:bg-white/5 cursor-pointer text-[#94a3b8] hover:text-white transition-all text-[13px] font-semibold"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Settings size={18} />
              </div>
              <span>설정 (AI API Key)</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto relative h-screen flex flex-col bg-[#0B1221] text-slate-200 font-sans selection:bg-blue-500/30">

        <header className="h-[90px] bg-[#0B1221]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 flex items-center justify-between px-12 flex-shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h1 className="text-xl font-bold tracking-tighter text-blue-400">AUDITFLOW <span className="text-xs text-slate-500 ml-2">v4.2</span></h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px" }}>초정밀 진단 엔진 가동 중</span>
              </div>
            </div>
            {activeProject && (
              <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-2xl border border-blue-500/20 flex items-center gap-2.5 ml-6 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active: {activeProject}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <div className="flex flex-col items-end">
              <span style={{ fontSize: "10px", fontWeight: "900", color: "#475569", textTransform: "uppercase", letterSpacing: "2.5px" }}>Powered By</span>
              <span style={{ fontSize: "12px", fontWeight: "900", color: "#94a3b8", letterSpacing: "-0.3px" }}>Core AI Engine</span>
            </div>
            <div style={{ height: "40px", width: "1px", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "rgba(255,255,255,0.02)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <img src={insightrixLogo as any} alt="Engine" style={{ width: "140%", height: "140%", objectFit: "contain", display: "block", opacity: 0.8 }} />
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/data-upload/:id" element={<DataImport />} />
            <Route path="/workspace/:id?" element={<AuditWorkspace />} />
            <Route path="/portfolio" element={<AuditTask />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/report" element={<AuditReport />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/history" element={<AuditHistory />} />
            <Route path="/entity/:entityId/timeline" element={<EntityTimeline />} />
            <Route path="/flux-analysis" element={<FluxAnalysis />} />
            <Route path="/scenarios" element={<ScenarioManager />} />

            {/* Debug Routes (Hidden) */}
            <Route path="/debug/audit-lifecycle" element={<AuditLifecycle />} />
          </Routes>
        </div>
      </main>
    </div >
  );
}

function NavItem({ to, icon, label, onClick, currentPath, disabled }: any) {
  const isActive = currentPath === to;

  if (disabled) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
        borderRadius: "14px", color: "#475569", opacity: 0.5, cursor: "not-allowed",
        fontSize: "13px", fontWeight: "600"
      }}>
        {icon} <span style={{ letterSpacing: "-0.3px" }}>{label}</span>
      </div>
    );
  }

  return (
    <Link to={to} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
      borderRadius: "14px",
      color: isActive ? "#ffffff" : "#94a3b8",
      background: isActive ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" : "transparent",
      boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
      textDecoration: "none", fontWeight: isActive ? "700" : "600",
      fontSize: "13px", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      marginBottom: "2px"
    }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#f1f5f9"; e.currentTarget.style.transform = "translateX(4px)"; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.transform = "translateX(0)"; } }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", opacity: isActive ? 1 : 0.7 }}>
        {icon}
      </div>
      <span style={{ letterSpacing: "-0.3px" }}>{label}</span>
    </Link>
  );
}