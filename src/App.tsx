import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import {
  Menu, X, LayoutDashboard, Database, ShieldCheck,
  Activity, CreditCard, MessageSquare, FileText, BrainCircuit,
  LogOut, CheckCircle2, ChevronDown, TrendingUp, Layers, Box, BookOpen
} from "lucide-react";

import { AuditProvider } from "./context/AuditContext";

import auditflowLogo from "./assets/auditflow_logo.png";
import insightrixLogo from "./assets/insightrix_logo.png";

// 페이지 컴포넌트 임포트
import Dashboard from "./pages/Dashboard";
import DataImport from "./pages/DataImport";
import AnalysisResult from "./pages/AnalysisResult";
import ScenarioManager from "./pages/ScenarioManager";
import ProcessMonitoring from "./pages/ProcessMonitoring";
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
import AIAnalysisReport from "./components/AIAnalysisReport";

// [Context] 전역 상태 관리 (인증 및 프로젝트 스코프)
interface AppContextType {
  user: { tier: string } | null;
  activeProject: string | null;
  setActiveProject: (id: string | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

export default function App() {
  const [user, setUser] = useState<{ tier: string } | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  // 세션 유지 (브라우저 메모리상)
  const login = (tier: string) => setUser({ tier });
  const logout = () => { setUser(null); setActiveProject(null); };

  return (
    <AppContext.Provider value={{ user, activeProject, setActiveProject, logout }}>
      <AuditProvider>
        <Router>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
            <Route path="/*" element={user ? <Layout /> : <Navigate to="/login" />} />
          </Routes>
        </Router>
      </AuditProvider>
    </AppContext.Provider>
  );
}

function Layout() {
  const { user, activeProject, logout } = useApp();
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
            <img src={auditflowLogo} alt="AuditFlow" style={{ height: "24px", width: "auto", display: "block", objectFit: "contain" }} />
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
              <img src={auditflowLogo} alt="AuditFlow" style={{ width: "160%", height: "160%", objectFit: "contain", display: "block", transform: "scale(1.1)", filter: "brightness(1.2)" }} />
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
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 pl-1 opacity-50">Active Context</p>
          <div
            onClick={() => navigate('/portfolio')}
            className={`p-5 rounded-[22px] border cursor-pointer transition-all duration-300 ${activeProject ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border-blue-500/30 text-white shadow-xl shadow-blue-950/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${activeProject ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                <FileText size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight opacity-70">Focus Project</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black truncate max-w-[150px] tracking-tight">{activeProject || 'Select Project...'}</span>
              <ChevronDown size={14} className="opacity-40" />
            </div>
          </div>
          {!activeProject && location.pathname !== '/tasks' && (
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[9px] text-blue-400 font-bold tracking-tight">Select project to reveal insights</p>
            </div>
          )}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Main Dashboard</p>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="통합 대시보드" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Audit Intelligence</p>
          <NavItem to="/risk-heatmap" icon={<Layers size={18} />} label="리스크 히트맵" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/portfolio" icon={<FileText size={18} />} label="감사 포트폴리오 (관리)" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/ai" icon={<MessageSquare size={18} />} label="AI 어시스턴트" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/knowledge-base" icon={<BookOpen size={18} />} label="지식 베이스 (RAG)" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Data & Analysis</p>
          <NavItem to="/data-upload" icon={<Database size={18} />} label="데이터 업로드 (실행)" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/ai-discovery" icon={<BrainCircuit size={18} />} label="AI 분석 리포트" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/scenarios" icon={<ShieldCheck size={18} />} label="시나리오 관리" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/mining" icon={<Activity size={18} />} label="프로세스 마이닝" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Specialized Audit</p>
          <NavItem to="/production" icon={<Box size={18} />} label="생산 계획 예측" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/card" icon={<CreditCard size={18} />} label="법인카드 감사" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-2 px-4 opacity-50">Reporting & Planning</p>
          <NavItem to="/remediation" icon={<CheckCircle2 size={18} />} label="조치 이행 관리" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/report" icon={<FileText size={18} />} label="최종 감사 보고서" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} disabled={!activeProject} />
          <NavItem to="/executive" icon={<TrendingUp size={18} />} label="경영진 보고 및 계획" currentPath={location.pathname} onClick={() => isMobile && setSidebarOpen(false)} />
        </nav>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto relative h-screen flex flex-col bg-[#0B1221] text-slate-200 font-sans selection:bg-blue-500/30">

        <header className="h-[90px] bg-[#0B1221]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 flex items-center justify-between px-12 flex-shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h1 className="text-xl font-bold tracking-tighter text-blue-400">AUDITFLOW PRO <span className="text-xs text-slate-500 ml-2">v4.2</span></h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px" }}>Live Engine</span>
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
              <img src={insightrixLogo} alt="Engine" style={{ width: "140%", height: "140%", objectFit: "contain", display: "block", opacity: 0.8 }} />
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/analysis-result" element={<AnalysisResult onBack={() => navigate('/')} />} />
            <Route path="/portfolio" element={<AuditTask />} />
            <Route path="/scenarios" element={<ScenarioManager />} />
            <Route path="/mining" element={<ProcessMonitoring />} />
            <Route path="/production" element={<ProductionMonitor />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/card" element={<CorpCardAudit />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/report" element={<AuditReport />} />
            <Route path="/remediation" element={<RemediationDashboard />} />
            <Route path="/executive" element={<ExecutiveAdmin />} />
            <Route path="/risk-heatmap" element={<RiskHeatmap />} />
            <Route path="/data-upload" element={<DataImport />} />
            <Route path="/data-upload/:id" element={<DataImport />} />
            <Route path="/ai-discovery" element={<AIAnalysisReport />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
          </Routes>
        </div>
      </main>
    </div>
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