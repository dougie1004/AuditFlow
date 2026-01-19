import { useState } from "react";
import {
    ShieldCheck, ArrowRight, Check, Zap, Crown, Target,
    Mail, Lock, CreditCard, ChevronLeft, Loader2, Sparkles, Building2
} from "lucide-react";

interface LoginProps {
    onLogin: (tier: string) => void;
}

const tiers = [
    {
        id: "Lite",
        name: "Lite",
        price: "9.9만 원",
        target: "5인 미만 사업장",
        value: "진입 장벽 최소화",
        features: [
            "기본 룰셋 및 챗봇 감사",
            "Gemini 3.0 (100%)",
            "전표 월 1,000행 제한",
            "문서 월 10건 제한"
        ],
        color: "slate",
        icon: <Zap className="text-slate-400" />
    },
    {
        id: "Pro",
        name: "Pro",
        price: "29.9만 원",
        target: "시리즈 A~B 스타트업",
        value: "AI 심층 분석 제공",
        features: [
            "AI (Gemini 3.0) 심층 분석",
            "Profit Guard (이상징후 탐지)",
            "전표 월 5,000행 제한",
            "문서 월 50건 제한"
        ],
        highlight: true,
        color: "blue",
        icon: <Target className="text-blue-500" />
    },
    {
        id: "Enterprise",
        name: "Enterprise",
        price: "별도 견적",
        target: "중견기업 이상",
        value: "맞춤형 커스터마이징",
        features: [
            "사내 전용 로직(Rule) 개발",
            "Private 서버 구축 지원",
            "전표 무제한 처리",
            "도입비 500만원 별도"
        ],
        color: "indigo",
        icon: <Crown className="text-amber-500" />
    }
];

export default function Login({ onLogin }: LoginProps) {
    const [step, setStep] = useState(1); // 1: Auth, 2: Tier, 3: Payment
    const [selectedTier, setSelectedTier] = useState("Pro");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleTierSelect = (id: string) => {
        setSelectedTier(id);
        setStep(3);
    };

    const handlePayment = () => {
        setIsProcessing(true);
        // Simulate payment gateway delay
        setTimeout(() => {
            setIsProcessing(false);
            onLogin(selectedTier);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#0B1221] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />

            <div className="max-w-6xl w-full relative z-10">
                {/* Header Section */}
                {step < 3 && (
                    <div className="text-center space-y-4 mb-12">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-4">
                            <ShieldCheck className="text-blue-400 w-5 h-5" />
                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em]">Compliance DD Strategic Management</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                            Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI Compliance</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                            {step === 1 ? "계정에 접속하여 스마트 실사/진단을 시작하세요." : "귀하의 비즈니스 규모에 맞는 플랜을 선택하세요."}
                        </p>
                    </div>
                )}

                {/* Step 1: Authentication */}
                {step === 1 && (
                    <div className="max-w-md mx-auto">
                        <form onSubmit={handleAuth} className="bg-white/5 border border-white/10 rounded-[40px] p-10 space-y-6 backdrop-blur-xl">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@company.com"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold relative z-0"
                                        />
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 z-10 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Passcode</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold relative z-0"
                                        />
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 z-10 pointer-events-none" />
                                    </div>

                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-blue-400/20">
                                대시보드 접속 <ArrowRight size={16} className="text-white" />
                            </button>


                            <div className="text-center pt-4">
                                <p className="text-slate-500 text-xs font-medium">관리자 계정 분실 시 <span className="text-blue-400 cursor-pointer hover:underline">여기를 클릭</span>하세요.</p>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 2: Tier Selection */}
                {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {tiers.map((tier) => (
                            <div
                                key={tier.id}
                                onClick={() => handleTierSelect(tier.id)}
                                className={`relative group cursor-pointer transition-all duration-500 rounded-[32px] p-8 border-2 ${selectedTier === tier.id ? 'bg-white/10 border-blue-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                            >
                                {tier.highlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg border border-blue-400/50">
                                        전문가 추천
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`p-4 rounded-2xl bg-white/5`}>{tier.icon}</div>
                                    <div className="text-right">
                                        <p className="text-white text-2xl font-black tracking-tight">{tier.price}</p>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">월 구독료</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mb-8">
                                    <h3 className="text-2xl font-black text-white">{tier.name}</h3>
                                    <p className="text-sm font-bold text-blue-400">{tier.target}</p>
                                </div>
                                <div className="h-[1px] bg-white/10 mb-8" />
                                <ul className="space-y-4 mb-10 min-h-[160px]">
                                    {tier.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-1 p-0.5 rounded-full bg-blue-500">
                                                <Check size={10} className="text-white" />
                                            </div>
                                            <span className="text-xs text-slate-300 font-medium leading-relaxed">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all bg-white/5 text-slate-400 border border-white/10 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500">
                                    구독 및 시작하기
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 3: Payment Simulation */}
                {step === 3 && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white/10 border border-white/20 rounded-[40px] p-12 backdrop-blur-2xl shadow-2xl relative">
                            <button onClick={() => setStep(2)} className="absolute top-8 left-8 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <ChevronLeft size={16} /> 플랜 변경하기
                            </button>

                            <div className="text-center space-y-8 pt-6">
                                <div className="inline-flex items-center justify-center p-6 rounded-full bg-blue-600/20 mb-4">
                                    <CreditCard className="text-blue-400 w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-white">결제 승인 요청</h2>
                                    <p className="text-slate-400 font-medium">선택하신 <span className="text-white font-bold">[{selectedTier} Plan]</span>에 대한 구독 결제를 진행합니다.</p>
                                </div>

                                <div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-left space-y-4">
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Merchant</span>
                                        <span className="text-white">ComplianceFlow Korea</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Product Tier</span>
                                        <span className="text-blue-400 font-black">{selectedTier} (Annual Pack)</span>
                                    </div>
                                    <div className="h-[1px] bg-white/10 my-2" />
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black pb-1">Total Due</span>
                                        <span className="text-4xl font-black text-white">{tiers.find(t => t.id === selectedTier)?.price}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full bg-white text-slate-900 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" /> 거래 검증 중...
                                            </>
                                        ) : (
                                            <>
                                                보안 결제 시작 <Sparkles size={18} />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        * 실제 실습용 가상 결제 화면입니다. 결제가 승인되면 모든 실사/진단 엔진이 하드웨어에 배포됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Credits */}
                <div className="mt-20 flex flex-col items-center gap-6 opacity-40">
                    <div className="flex items-center gap-8">
                        <Building2 size={24} className="text-slate-500" />
                        <div className="h-8 w-[1px] bg-slate-800" />
                        <ShieldCheck size={24} className="text-slate-500" />
                    </div>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
                        ComplianceFlow Strategic Engine V4.0 // Secured by ComplianceFlow AES-256
                    </span>
                </div>
            </div>
        </div >
    );
}
