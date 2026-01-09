import { useState } from "react";
import { ShieldAlert, Cpu, Activity, TrendingUp, BarChart3 } from "lucide-react";

export default function ProductionMonitor() {
    const [safetyStock, setSafetyStock] = useState(20);

    return (
        <div className="bg-[#0B1221] min-h-screen p-10 space-y-10 text-slate-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        AI Inventory Core
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">생산 관리 및 재고 최적화 <span className="text-slate-500 font-medium">(AI Supply Chain)</span></h1>
                    <p className="text-slate-500 font-medium text-sm">AI가 시뮬레이션한 주간 수요 예측 및 재고 리스크 데이터입니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 고급 바 차트 */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[40px] shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <Activity className="text-blue-500" size={20} />
                            <h3 className="text-xl font-black text-white tracking-tight">수요-생산 주간 추이 (Forecast)</h3>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" /> 수요 예측
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> 생산 계획
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end h-[300px] gap-10 pb-6 border-b border-white/5 px-4">
                        {[80, 95, 70, 100, 110, 105].map((h, i) => (
                            <div key={i} className="flex-1 flex items-end gap-2 group cursor-pointer relative">
                                <div
                                    className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-black text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h}%
                                    </div>
                                </div>
                                <div
                                    className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125 delay-75"
                                    style={{ height: `${h - 10}%` }}
                                >
                                    <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-black text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                        {h - 10}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-around mt-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {["10.W1", "10.W2", "10.W3", "10.W4", "11.W1", "11.W2"].map(label => (
                            <span key={label}>{label}</span>
                        ))}
                    </div>
                </div>

                {/* 시뮬레이터 카드 */}
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[40px] shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-900/20">
                                <Cpu size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">AI 시뮬레이션</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Inventory Optimization</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                    <span className="text-slate-400">목표 안전 재고율</span>
                                    <span className="text-blue-400 text-lg">{safetyStock}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    value={safetyStock}
                                    onChange={(e) => setSafetyStock(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none hover:bg-white/10 transition-colors"
                                />
                                <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                                    <span>CONSERVATIVE</span>
                                    <span>AGGRESSIVE</span>
                                </div>
                            </div>

                            <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98] flex items-center justify-center gap-2">
                                <TrendingUp size={16} /> 최적 생산 계획 도출 (Run AI)
                            </button>

                            <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl space-y-3">
                                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                                    <ShieldAlert size={14} /> 예상 리스크 알림 (Anomaly)
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    설정하신 재고율 기준, <span className="text-rose-400 font-bold">11월 4주차</span>에 자재 결품 확률이 <span className="text-rose-400 font-black italic">24.5%</span> 증가할 것으로 예측됩니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="text-slate-600" size={16} />
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Model version: SCP-v2.1</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}