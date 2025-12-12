import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  AlertTriangle, 
  Settings, 
  LogOut, 
  ShieldCheck,
  BrainCircuit,
  FileCheck2
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'scenarios', label: '테스트 시나리오', icon: FileText },
    { id: 'reports', label: '상세 위반 분석', icon: AlertTriangle },
    { id: 'final-report', label: '감사 보고서 발행', icon: FileCheck2 }, // New item
    { id: 'ai-chat', label: 'AuditFlow AI', icon: BrainCircuit },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AuditFlow</h1>
          <p className="text-xs text-slate-400">AI Audit Platform</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
          <span>설정</span>
        </button>
        <button className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors mt-1">
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;