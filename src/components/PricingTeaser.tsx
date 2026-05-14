import { motion } from 'framer-motion';
import { Zap, ShieldCheck, Users, Globe, ArrowRight, Sparkles } from 'lucide-react';

const PricingTeaser = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-blue-900/40 border border-indigo-500/30 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl"
        >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full -mr-32 -mt-32 group-hover:bg-blue-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full -ml-24 -mb-24" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full w-fit">
                        <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Enterprise Ready</span>
                    </div>
                    
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-tight italic uppercase">
                        AuditFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">PRO</span> 로 업그레이드 하세요
                    </h2>
                    
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                        제한 없는 감사 유니버스 확장, 다중 사용자 실시간 협업, 그리고 더욱 정교한 
                        <span className="text-white mx-1">Deep-Reasoning AI</span> 엔진을 통해 기업의 리스크 관리 수준을 한 단계 높이십시오.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        {[
                            { icon: Globe, text: "무제한 엔티티 분석" },
                            { icon: Users, text: "팀 협업 및 승인 결재" },
                            { icon: ShieldCheck, text: "ISO/SOC2 컴플라이언스" },
                            { icon: Zap, text: "Gemini 2.5 Pro 코어" },
                        ].map((feat, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                    <feat.icon size={10} className="text-indigo-400" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{feat.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="shrink-0 flex flex-col items-center gap-4">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Plan</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">
                            ₩990,000 <span className="text-sm text-slate-500 not-italic">/ mo</span>
                        </p>
                    </div>
                    
                    <button className="px-8 py-4 bg-white text-indigo-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-50 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 flex items-center gap-3 group/btn">
                        엔터프라이즈 도입 문의
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                        * 초기 도입 시 컨설팅 팩 무상 제공
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default PricingTeaser;
