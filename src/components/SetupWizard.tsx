import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, Mail, User, Building2, ShieldCheck, 
    ChevronRight, ArrowRight, CheckCircle2, 
    Sparkles, BrainCircuit, ShieldAlert, Lock
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function SetupWizard() {
    const [step, setStep] = useState(1);
    const { register, isLoading } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        tier: 'Standard'
    });

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleComplete = async () => {
        try {
            await register(formData.name, formData.email, formData.company, formData.tier);
        } catch (e) {
            alert('가입 중 오류가 발생했습니다.');
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        },
        exit: { 
            opacity: 0, 
            x: -20,
            transition: { duration: 0.3 }
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#0b0e14] flex items-center justify-center overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-6xl px-12 grid grid-cols-2 gap-24 items-center">
                {/* Left Side: Branding (Persistent) */}
                <motion.div 
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter italic">AuditFlow</h1>
                    </div>
                    
                    <h2 className="text-4xl font-black text-white leading-tight mb-8">
                        차세대 AI 감사 시스템,<br/>
                        <span className="text-slate-400">기업의 투명성을 책임집니다.</span>
                    </h2>

                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-3xl p-8 max-w-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={64} className="text-blue-400" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <Zap size={20} className="text-blue-400" />
                            <span className="text-sm font-black text-white uppercase tracking-widest">Instant Auditor Experience</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            파일럿 프로그램 참여를 환영합니다. 가입 시 <span className="text-blue-400 font-bold underline">전략적 샘플 데이터</span>가 자동으로 로드됩니다. 업로드 없이 즉시 AI 분석 결과를 확인하세요.
                        </p>
                    </div>
                </motion.div>

                {/* Right Side: Step-by-Step Card */}
                <div className="relative min-h-[600px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-[#151921]/80 border border-white/5 rounded-[48px] p-12 backdrop-blur-3xl shadow-2xl relative"
                            >
                                <div className="flex bg-black/40 p-1.5 rounded-2xl mb-12 border border-white/5">
                                    <button className="flex-1 py-3 bg-[#4f46e5] text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-900/40 tracking-widest">LOGIN</button>
                                    <button onClick={handleNext} className="flex-1 py-3 text-slate-500 text-xs font-black hover:text-white transition-colors tracking-widest">JOIN FREE</button>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                            <input 
                                                type="email"
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                                                placeholder="user@company.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                            <input 
                                                type="password"
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleNext}
                                        className="w-full py-5 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-3 tracking-widest text-sm"
                                    >
                                        SIGN IN TO SYSTEM
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                                <div className="mt-8 text-center">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Secured by AuditFlow Intelligence</span>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-[#151921]/80 border border-white/5 rounded-[48px] p-12 backdrop-blur-3xl shadow-2xl relative"
                            >
                                <div className="mb-10 text-center">
                                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">사용자 정보 입력</h2>
                                    <p className="text-slate-400 text-sm">프로필을 설정하여 리포트를 개인화하세요.</p>
                                </div>

                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">이름</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input 
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({...formData, name: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="홍길동"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">이메일 확인</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input 
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="audit@company.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">회사/조직명</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input 
                                                type="text"
                                                value={formData.company}
                                                onChange={e => setFormData({...formData, company: e.target.value})}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="삼성전자 감사팀"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
                                    <button onClick={handleBack} className="text-slate-500 font-bold hover:text-white transition-colors px-6 py-2">이전</button>
                                    <button 
                                        onClick={handleNext} 
                                        disabled={!formData.name || !formData.email || !formData.company}
                                        className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        다음 단계
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-[#151921]/80 border border-white/5 rounded-[48px] p-12 backdrop-blur-3xl shadow-2xl relative w-[600px]"
                            >
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">서비스 플랜 선택</h2>
                                    <p className="text-slate-400 text-sm">필요 기능에 맞는 플랜을 선택하세요.</p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { id: 'Standard', name: 'Standard', price: '₩490,000', icon: <Sparkles className="text-blue-400" size={20} />, desc: '중소 규모 조직용' },
                                        { id: 'Enterprise', name: 'Enterprise', price: '별도 문의', icon: <BrainCircuit className="text-emerald-400" size={20} />, desc: '대규모 엔터프라이즈' },
                                        { id: 'Trial', name: 'Free Trial', price: 'Free', icon: <Zap className="text-amber-400" size={20} />, desc: '30일 무료 체험' }
                                    ].map((p) => (
                                        <div 
                                            key={p.id}
                                            onClick={() => setFormData({...formData, tier: p.id})}
                                            className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center gap-5 ${
                                                formData.tier === p.id 
                                                ? 'bg-indigo-600/10 border-indigo-500 ring-4 ring-indigo-500/10' 
                                                : 'bg-black/40 border-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                                                {p.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-white">{p.name}</h3>
                                                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{p.desc}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-white">{p.price}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
                                    <button onClick={handleBack} className="text-slate-500 font-bold hover:text-white transition-colors px-6 py-2">이전</button>
                                    <button 
                                        onClick={handleNext}
                                        className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2"
                                    >
                                        최종 확인
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-[#151921]/80 border border-white/5 rounded-[48px] p-12 backdrop-blur-3xl shadow-2xl relative"
                            >
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
                                    <ShieldCheck size={32} className="text-emerald-400" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-6 text-center">설정이 완료되었습니다</h2>
                                <div className="bg-black/40 rounded-3xl p-8 mb-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Auditor</span>
                                        <span className="text-white font-black">{formData.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Organization</span>
                                        <span className="text-white font-black">{formData.company}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">System Tier</span>
                                        <span className="text-indigo-400 font-black">{formData.tier}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleComplete}
                                    disabled={isLoading}
                                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-3 tracking-widest"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            AuditFlow 시작하기
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Progress Indicators */}
                    <div className="mt-8 flex items-center justify-center gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <div 
                                key={s}
                                className={`h-1.5 transition-all duration-500 rounded-full ${
                                    s === step ? 'w-8 bg-indigo-500' : 
                                    s < step ? 'w-4 bg-emerald-500/50' : 'w-4 bg-white/10'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
