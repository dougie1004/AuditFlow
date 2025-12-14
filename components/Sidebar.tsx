
import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud,
  ListChecks,
  CreditCard,
  LineChart,
  Settings, 
  LogOut, 
  ShieldCheck,
  X,
  FileSearch,
  FileText,
  Sparkles,
  Activity,
  Briefcase
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'ai-reports', label: 'AI 분석 리포트', icon: FileSearch },
    { id: 'final-report', label: '감사 보고서', icon: FileText },
    { id: 'ai-chat', label: 'AI 어시스턴트', icon: Sparkles },
    { type: 'divider' },
    { id: 'audit-management', label: '감사 업무 관리', icon: Briefcase }, // New Menu Item
    { id: 'data-upload', label: '데이터 업로드', icon: UploadCloud },
    { id: 'scenario-manager', label: '시나리오 관리', icon: ListChecks },
    { type: 'divider' },
    { id: 'corp-card-audit', label: '법인카드 감사', icon: CreditCard },
    { id: 'production-forecast', label: '생산 관리 예측', icon: LineChart },
    { id: 'process-monitoring', label: '프로세스 모니터링', icon: Activity },
  ];

  return (
    <>
      {/* Backdrop for mobile view */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>

      <div className={`w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 border-r border-slate-800`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AuditFlow</h1>
              <p className="text-xs text-slate-400">AI Audit Platform</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div key={index} className="px-4 py-2">
                  <hr className="border-t border-slate-800" />
                </div>
              );
            }
            
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id!)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeView === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
            <span>설정</span>
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
