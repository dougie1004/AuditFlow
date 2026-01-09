
import React, { useState } from 'react';
import { Calendar, CheckSquare, FileText, UserCheck, Plus, Trash2, Clock, PlayCircle, Download, ChevronRight, Check, ListTodo, FileSearch } from 'lucide-react';
import { AuditTask, AuditPhase } from '../types';

const INITIAL_TASKS: AuditTask[] = [
  { id: 't1', phase: 'Planning', date: '2025-11-01', content: '감사 계획 수립 및 범위 확정', completed: true, assignee: '김철수' },
  { id: 't2', phase: 'Planning', date: '2025-11-03', content: '예비 조사 및 리스크 평가', completed: true, assignee: '이영희' },
  { id: 't3', phase: 'Planning', date: '2025-11-05', content: '감사 통지서 발송', completed: true, assignee: '박지성' },
  { id: 't4', phase: 'Fieldwork', date: '2025-11-10', content: '재무제표 데이터 추출 및 정합성 검증', completed: true, assignee: 'System' },
  { id: 't5', phase: 'Fieldwork', date: '2025-11-12', content: '현업 부서 인터뷰 수행 (재무팀)', completed: false, assignee: '김철수' },
  { id: 't6', phase: 'Fieldwork', date: '2025-11-15', content: '비정형 데이터(계약서) AI 분석 실행', completed: false, assignee: 'AuditFlow AI' },
  { id: 't7', phase: 'Reporting', date: '2025-11-25', content: '초안 보고서 작성', completed: false, assignee: '이영희' },
  { id: 't8', phase: 'Reporting', date: '2025-11-30', content: '경영진 보고 및 최종 승인', completed: false, assignee: '최임원' },
];

const AuditManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'resources'>('schedule');
  const [tasks, setTasks] = useState<AuditTask[]>(INITIAL_TASKS);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState<AuditPhase>('Planning');

  // Resource Generation States
  const [selectedArea, setSelectedArea] = useState('재무/회계');
  const [generatedRequests, setGeneratedRequests] = useState<string[]>([]);
  const [isGeneratingRequests, setIsGeneratingRequests] = useState(false);

  const [selectedRole, setSelectedRole] = useState('CFO (최고재무책임자)');
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // --- Task Management Functions ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent || !newTaskDate) return;
    const newTask: AuditTask = {
      id: Date.now().toString(),
      phase: newTaskPhase,
      date: newTaskDate,
      content: newTaskContent,
      completed: false,
      assignee: '감사인'
    };
    setTasks([...tasks, newTask]);
    setNewTaskContent('');
    setNewTaskDate('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0;

  // --- AI Generation Functions ---
  const generateDataRequests = () => {
    setIsGeneratingRequests(true);
    setTimeout(() => {
      setGeneratedRequests([
        '2025년도 3분기 결산 시산표 (Trial Balance)',
        '주요 은행 계좌(신한, 국민) 잔액 증명서',
        '법인카드 사용 내역 원장 (상세 적요 포함)',
        '매출 채권 연령 분석 보고서 (Aging Report)',
        '주요 공급업체(Top 10) 계약서 사본',
        '재고 실사 보고서 및 조정 내역서'
      ]);
      setIsGeneratingRequests(false);
    }, 500); // Demo speed: 500ms
  };

  const generateQuestions = () => {
    setIsGeneratingQuestions(true);
    setTimeout(() => {
      setGeneratedQuestions([
        '지난 분기 비표준 분개(Non-standard JE) 승인 절차에 변경 사항이 있었습니까?',
        '매출 인식 기준과 관련하여 최근 회계 감사인과 논의된 주요 이슈는 무엇입니까?',
        '자금 이체 시 OTP 관리 및 승인 권한 분리가 실질적으로 어떻게 이루어지고 있습니까?',
        '법인카드 사용 규정 위반 사례 발생 시 사후 조치 프로세스는 어떻게 됩니까?',
        'ERP 시스템 접근 권한 검토 주기는 어떻게 되며, 최근 퇴직자 권한 회수는 적시에 이루어졌습니까?'
      ]);
      setIsGeneratingQuestions(false);
    }, 500); // Demo speed: 500ms
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">감사 업무 관리 (Audit Management)</h2>
           <p className="text-slate-500 mt-1">감사 계획 수립부터 실행, 자원 관리까지 통합 관리합니다.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${activeTab === 'schedule' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Calendar className="w-4 h-4" /> 일정 및 진척도
          </button>
          <button 
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText className="w-4 h-4" /> 자료 및 인터뷰
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-end mb-2">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">전체 감사 진척도</h3>
                   <p className="text-sm text-slate-500">Planning → Fieldwork → Reporting</p>
                </div>
                <span className="text-3xl font-bold text-blue-600">{progress}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Task List */}
             <div className="lg:col-span-2 space-y-6">
                {['Planning', 'Fieldwork', 'Reporting'].map((phase) => (
                  <div key={phase} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                           <ListTodo className="w-5 h-5 text-slate-500" />
                           {phase === 'Planning' ? '감사 계획 (Planning)' : phase === 'Fieldwork' ? '현장 감사 (Fieldwork)' : '보고 및 종료 (Reporting)'}
                        </h4>
                        <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500 font-mono">
                           {tasks.filter(t => t.phase === phase && t.completed).length} / {tasks.filter(t => t.phase === phase).length}
                        </span>
                     </div>
                     <div className="divide-y divide-slate-100">
                        {tasks.filter(t => t.phase === phase).map(task => (
                           <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 group transition-colors">
                              <button 
                                onClick={() => toggleTask(task.id)}
                                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-blue-400'}`}
                              >
                                 {task.completed && <Check className="w-3.5 h-3.5" />}
                              </button>
                              <div className="flex-1">
                                 <p className={`text-sm text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.content}</p>
                                 <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.date}</span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1"><UserCheck className="w-3 h-3" /> {task.assignee}</span>
                                 </div>
                              </div>
                              <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                        {tasks.filter(t => t.phase === phase).length === 0 && (
                           <p className="p-8 text-center text-sm text-slate-400">등록된 태스크가 없습니다.</p>
                        )}
                     </div>
                  </div>
                ))}
             </div>

             {/* Add Task Form */}
             <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                   <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" /> 새 업무 등록
                   </h3>
                   <form onSubmit={handleAddTask} className="space-y-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">단계 (Phase)</label>
                         <select 
                           value={newTaskPhase}
                           onChange={(e) => setNewTaskPhase(e.target.value as AuditPhase)}
                           className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         >
                            <option value="Planning">감사 계획 (Planning)</option>
                            <option value="Fieldwork">현장 감사 (Fieldwork)</option>
                            <option value="Reporting">보고 및 종료 (Reporting)</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">날짜 (Date)</label>
                         <input 
                           type="date"
                           value={newTaskDate}
                           onChange={(e) => setNewTaskDate(e.target.value)}
                           className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">업무 내용 (Task)</label>
                         <textarea 
                           value={newTaskContent}
                           onChange={(e) => setNewTaskContent(e.target.value)}
                           rows={3}
                           placeholder="수행할 감사 업무를 입력하세요..."
                           className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                         />
                      </div>
                      <button 
                        type="submit" 
                        disabled={!newTaskContent || !newTaskDate}
                        className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                         추가하기
                      </button>
                   </form>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Data Request Generator */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="mb-6">
                 <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <FileSearch className="w-6 h-6 text-indigo-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">요청 자료 자동 생성</h3>
                 <p className="text-sm text-slate-500 mt-1">감사 영역별로 필요한 표준 감사 증빙 목록을 AI가 자동으로 생성합니다.</p>
              </div>
              
              <div className="flex gap-2 mb-6">
                 <select 
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="flex-1 p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                    <option>재무/회계</option>
                    <option>인사/급여</option>
                    <option>구매/자재</option>
                    <option>IT/보안</option>
                 </select>
                 <button 
                    onClick={generateDataRequests}
                    disabled={isGeneratingRequests}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-2"
                 >
                    {isGeneratingRequests ? <Clock className="w-4 h-4 animate-spin"/> : <PlayCircle className="w-4 h-4"/>}
                    생성
                 </button>
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4">
                 {generatedRequests.length > 0 ? (
                    <ul className="space-y-3">
                       {generatedRequests.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 bg-white p-3 rounded border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{animationDelay: `${idx * 100}ms`}}>
                             <div className="mt-0.5 min-w-[1.25rem] h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                             {req}
                          </li>
                       ))}
                    </ul>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                       <FileText className="w-12 h-12 mb-3 opacity-20" />
                       <p>영역을 선택하고 생성 버튼을 누르세요.</p>
                    </div>
                 )}
              </div>
           </div>

           {/* Interview Question Generator */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="mb-6">
                 <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="w-6 h-6 text-emerald-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">인터뷰 질문지 생성</h3>
                 <p className="text-sm text-slate-500 mt-1">인터뷰 대상자의 역할과 리스크를 기반으로 핵심 질문 리스트를 도출합니다.</p>
              </div>
              
              <div className="flex gap-2 mb-6">
                 <select 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 >
                    <option>CFO (최고재무책임자)</option>
                    <option>인사팀장</option>
                    <option>구매팀장</option>
                    <option>CISO (정보보호책임자)</option>
                 </select>
                 <button 
                    onClick={generateQuestions}
                    disabled={isGeneratingQuestions}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors flex items-center gap-2"
                 >
                    {isGeneratingQuestions ? <Clock className="w-4 h-4 animate-spin"/> : <PlayCircle className="w-4 h-4"/>}
                    생성
                 </button>
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4">
                 {generatedQuestions.length > 0 ? (
                    <ul className="space-y-3">
                       {generatedQuestions.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 bg-white p-3 rounded border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{animationDelay: `${idx * 100}ms`}}>
                             <ChevronRight className="w-5 h-5 text-emerald-500 shrink-0" />
                             {q}
                          </li>
                       ))}
                    </ul>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                       <UserCheck className="w-12 h-12 mb-3 opacity-20" />
                       <p>역할을 선택하고 생성 버튼을 누르세요.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AuditManagement;
