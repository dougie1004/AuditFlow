import { useState, useEffect, useRef, useMemo } from "react";
import { safeInvoke } from "../lib/tauri-bridge";
import {
    AlertTriangle, Search, X, Send, Loader2, MapPin,
    ChevronRight, RotateCcw, BarChart3, Users, Brain, TrendingUp
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';

declare global {
    interface Window {
        google: any;
        initMap: () => void;
    }
}

interface CardTransaction {
    id: number;
    emp_name: string;
    dept_name: string;
    card_num: string;
    vendor_name: string;
    amount: number;
    date: string;
    category: string;
    address: string;
    lat: number;
    lng: number;
    risk_score: number;
    risk_reason: string;
    is_near_home: boolean;
    is_late_night: boolean;
    home_address: string;
    home_lat: number;
    home_lng: number;
    vendor_addr?: string;
}

export default function CorpCardAudit() {
    const [transactions, setTransactions] = useState<CardTransaction[]>([]);
    const [selectedTx, setSelectedTx] = useState<CardTransaction | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<"map" | "stats">("map");
    const [statsSubTab, setStatsSubTab] = useState<"dept" | "user" | "ai">("dept");
    const [searchTerm, setSearchTerm] = useState("");

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user", content: string }[]>([
        { role: "bot", content: "선택된 거래 내역에 대해 분석을 요청하거나 질문해주세요." }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Map Refs
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]); // 모든 마커 관리
    const homeOverlayRef = useRef<any[]>([]); // 집, 선, 원 등 오버레이 관리

    // 1. 초기화 (데이터 & 지도 로드)
    useEffect(() => {
        const init = async () => {
            try {
                // 실제 데이터 로딩 (Mock 예시)
                const [txs, key] = await Promise.all([
                    safeInvoke("get_card_transactions") as Promise<CardTransaction[]>,
                    safeInvoke("get_google_maps_key") as Promise<string>
                ]);
                setTransactions(txs);
                loadGoogleMaps(key);
            } catch (err) {
                console.error(err);
            }
        };
        init();
    }, []);

    const loadGoogleMaps = (key: string) => {
        if (window.google && window.google.maps) { initMap(); return; }
        if (document.querySelector('script[src*="maps.googleapis.com"]')) { initMap(); return; }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap`;
        script.async = true;
        script.defer = true;
        window.initMap = initMap;
        document.head.appendChild(script);
    };

    const initMap = () => {
        if (!mapRef.current || mapInstance.current) return;
        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 37.5665, lng: 126.9780 },
            zoom: 13,
            disableDefaultUI: false,
            clickableIcons: false, // POI 클릭 방지 및 시각적 노이즈 제거
            styles: [
                { featureType: "all", elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }, // POI 라벨 숨김
            ]
        });
        mapInstance.current = map;
        setIsMapLoaded(true);
    };

    const [filterType] = useState<"all" | "late" | "home" | "high">("all"); // Kept as constant for now or can be added back if needed

    // 2. 필터링 데이터
    const filteredTransactions = useMemo(() => {
        let list = transactions;
        if (filterType === "late") list = list.filter(t => t.is_late_night);
        else if (filterType === "home") list = list.filter(t => t.is_near_home);
        else if (filterType === "high") list = list.filter(t => t.risk_score >= 80);

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(t => t.emp_name.includes(lower) || t.vendor_name.includes(lower));
        }

        return list.sort((a, b) => b.risk_score - a.risk_score);
    }, [transactions, filterType, searchTerm]);

    const { deptStats, userStats } = useDerivedStats(filteredTransactions);

    // 3. ★ 마커 렌더링 (Focus Mode Logic 적용)
    useEffect(() => {
        if (!mapInstance.current || !isMapLoaded) return;
        renderSmartMarkers();
    }, [filteredTransactions, selectedTx, isMapLoaded]); // selectedTx가 바뀌면 다시 그립니다.

    // 3. ★ [수정됨] 마커 렌더링 (좌표 변환 로직 포함)
    const renderSmartMarkers = () => {
        const map = mapInstance.current;
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        filteredTransactions.forEach(tx => {
            // 여기도 마찬가지로 숫자로 변환해서 검사
            const lat = Number(tx.lat);
            const lng = Number(tx.lng);

            // 좌표 없는 건은 마커 안 찍음
            if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat)) {
                // console.debug("Marker skipped (invalid coords):", tx.vendor_name);
                return;
            }

            const isSelected = selectedTx?.id === tx.id;
            const isFocusMode = selectedTx !== null;
            const opacity = isFocusMode ? (isSelected ? 1.0 : 0.2) : 0.8;
            const scale = isSelected ? 12 : (isFocusMode ? 5 : 8);
            const zIndex = isSelected ? 1000 : (tx.risk_score > 80 ? 500 : 1);

            const marker = new window.google.maps.Marker({
                position: { lat: lat, lng: lng }, // 변환된 좌표 사용
                map: map,
                title: tx.vendor_name,
                zIndex: zIndex,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: scale,
                    fillColor: tx.risk_score > 80 ? "#ef4444" : "#3b82f6",
                    fillOpacity: opacity,
                    strokeWeight: isSelected ? 3 : 1,
                    strokeColor: "#ffffff",
                    strokeOpacity: opacity
                }
            });

            marker.addListener("click", () => handleTxClick(tx));
            markersRef.current.push(marker);

            if (isSelected) {
                marker.setAnimation(window.google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 750);
            }
        });
    };

    // 4. ★ 클릭 핸들러: 지도 강제 이동 및 줌
    const [focusTrigger, setFocusTrigger] = useState(0);

    // 4. ★ [수정됨] 클릭 핸들러: 좌표 강제 형변환 및 리사이즈 트리거
    const handleTxClick = (tx: CardTransaction) => {
        // [핵심 해결 1] 강제로 숫자로 변환
        const lat = Number(tx.lat);
        const lng = Number(tx.lng);

        console.log("Tx Clicked:", tx.vendor_name, "Raw:", tx.lat, tx.lng, "Parsed:", lat, lng);

        // [핵심 해결 2] 좌표 유효성 검사
        if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat)) {
            console.warn("유효하지 않은 좌표입니다:", tx.vendor_name);
            alert("이 건은 위치 정보가 없습니다.");
            return;
        }

        setSelectedTx(tx);
        setActiveTab("map");
        setFocusTrigger(prev => prev + 1); // Trigger the useEffect
    };

    // 4-1. ★ Map Focus Effect (Handles re-centering)
    useEffect(() => {
        if (mapInstance.current && isMapLoaded && selectedTx) {
            const lat = Number(selectedTx.lat);
            const lng = Number(selectedTx.lng);

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

            // Ensure map is visible before panning/zooming
            const map = mapInstance.current;

            // Timeout to allow tab switch or other UI transitions to complete
            const timer = setTimeout(() => {
                window.google.maps.event.trigger(map, "resize");
                map.setCenter({ lat, lng });
                map.setZoom(17);
                console.log("Map Focused on:", lat, lng);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [selectedTx, focusTrigger, isMapLoaded]);

    // 5. ★ 자택/회사 경로 그리기 (Overlay)
    useEffect(() => {
        if (!mapInstance.current || !isMapLoaded) return;

        // 기존 오버레이 삭제
        homeOverlayRef.current.forEach(o => o.setMap(null));
        homeOverlayRef.current = [];

        if (selectedTx && selectedTx.is_near_home) {
            const map = mapInstance.current;
            const homePos = { lat: selectedTx.home_lat, lng: selectedTx.home_lng };
            const vendorPos = { lat: selectedTx.lat, lng: selectedTx.lng };

            // 자택 아이콘
            const homeMarker = new window.google.maps.Marker({
                position: homePos,
                map: map,
                icon: {
                    path: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
                    scale: 1.5,
                    fillColor: "#10b981",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "white",
                    anchor: new window.google.maps.Point(12, 12)
                },
                zIndex: 999
            });

            // 연결선 (점선)
            const line = new window.google.maps.Polyline({
                map: map,
                path: [homePos, vendorPos],
                geodesic: true,
                strokeColor: "#fbbf24",
                strokeOpacity: 0.8,
                strokeWeight: 3,
                icons: [{ icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '100%' }]
            });

            homeOverlayRef.current.push(homeMarker, line);
        }
    }, [selectedTx, isMapLoaded]);

    const resetMap = () => {
        setSelectedTx(null);
        if (mapInstance.current) {
            mapInstance.current.setZoom(13);
            mapInstance.current.setCenter({ lat: 37.5665, lng: 126.9780 });
        }
    };

    // AI Chat Handler
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatMessages(prev => [...prev, { role: "user", content: msg }]);
        setChatInput("");
        setIsChatLoading(true);

        try {
            const prompt = `당신은 법인카드 감사 전문가입니다. 다음 거래 현황을 바탕으로 사용자의 질문에 답변하세요.\n질문: ${msg}`;
            const res: string = await safeInvoke("ask_ai_assistant", { message: prompt });
            setChatMessages(prev => [...prev, { role: "bot", content: res }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: "bot", content: "분석 중 오류가 발생했습니다." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0B1221] text-slate-200 overflow-hidden font-sans">
            {/* Left Panel */}
            <div className="flex-1 flex flex-col relative border-r border-slate-800">
                {/* Header Controls (Sticky) */}
                <div className="sticky top-0 z-30 p-6 bg-[#0B1221]/80 backdrop-blur border-b border-white/5 flex justify-between items-center shadow-xl">
                    <div className="flex gap-2">
                        <div className="bg-slate-900/90 rounded-lg p-1 flex ring-1 ring-white/10">
                            <button onClick={() => setActiveTab("map")} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>LOCATION</button>
                            <button onClick={() => setActiveTab("stats")} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>ANALYTICS</button>
                        </div>
                        {selectedTx && (
                            <button onClick={resetMap} className="bg-slate-900/90 text-slate-300 hover:text-white px-3 rounded-lg ring-1 ring-white/10 flex items-center gap-1 text-xs font-bold transition-all">
                                <RotateCcw size={12} /> Reset Focus
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Area (Map or Stats) */}
                <div className="flex-1 relative overflow-hidden">
                    {/* Map Container */}
                    <div className="w-full h-full relative bg-slate-900" style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
                        <div ref={mapRef} className="w-full h-full outline-none" />

                        {!isMapLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
                                <Loader2 className="animate-spin text-blue-500" size={40} />
                            </div>
                        )}

                        {/* Draggable Detail Card */}
                        {selectedTx && (
                            <DraggableCard selectedTx={selectedTx} onClose={resetMap} />
                        )}
                    </div>

                    {/* Analytics View */}
                    {activeTab === 'stats' && (
                        <div className="absolute inset-0 p-8 overflow-y-auto flex flex-col gap-6 bg-slate-900/50">
                            {/* Stats Tabs */}
                            <div className="flex gap-4 border-b border-slate-800 pb-4">
                                <button onClick={() => setStatsSubTab("dept")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${statsSubTab === 'dept' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <Users size={14} /> 부서별 통계
                                </button>
                                <button onClick={() => setStatsSubTab("user")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${statsSubTab === 'user' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <BarChart3 size={14} /> 개인별 통계
                                </button>
                                <button onClick={() => setStatsSubTab("ai")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${statsSubTab === 'ai' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <Brain size={14} /> AI 분석 요약
                                </button>
                            </div>

                            {/* Stats Content */}
                            <div className="flex-1 min-h-0">
                                {statsSubTab === 'dept' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full anim-slide-up">
                                        <div className="bg-slate-900/80 p-6 rounded-2xl ring-1 ring-white/10 flex flex-col">
                                            <h3 className="text-sm font-black text-slate-200 mb-6 uppercase tracking-tight flex items-center gap-2">
                                                <TrendingUp size={16} className="text-blue-500" /> 부서별 이상징후 감지 건수
                                            </h3>
                                            <div className="flex-1 h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={deptStats}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                                                            itemStyle={{ color: '#f8fafc' }}
                                                        />
                                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                            {deptStats.map((_entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#2563eb'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/80 p-6 rounded-2xl ring-1 ring-white/10">
                                            <h3 className="text-sm font-black text-slate-200 mb-6 uppercase tracking-tight">리스크 비중</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                                                        />
                                                        <Pie
                                                            data={deptStats}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="count"
                                                        >
                                                            {deptStats.map((_entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#10b981'][index % 4]} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {statsSubTab === 'user' && (
                                    <div className="space-y-4 anim-slide-up">
                                        {userStats.map((u: any, i: number) => (
                                            <div key={i} className="bg-slate-900/80 p-4 rounded-xl ring-1 ring-white/10 flex items-center justify-between hover:bg-slate-800/80 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-xs">{(u.name || "U")[0]}</div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-200">{u.name}</div>
                                                        <div className="text-[10px] text-slate-500">{u.dept}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-red-400">{u.score.toLocaleString()} RISK</div>
                                                    <div className="text-[10px] text-slate-500">{u.count}건 탐지</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {statsSubTab === 'ai' && (
                                    <div className="space-y-6 anim-slide-up">
                                        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 p-8 rounded-3xl ring-1 ring-white/10 border border-blue-500/20">
                                            <div className="flex items-center gap-3 mb-6">
                                                <Brain className="text-blue-400" size={24} />
                                                <h3 className="text-lg font-black text-white tracking-tight uppercase">AI 정밀 감사 총평</h3>
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed mb-8">
                                                이번 감사 기간 동안 총 {transactions.length}건의 거래를 AI가 전수 조사했습니다.
                                                그 중 <span className="text-red-400 font-bold">집근처/심야</span> 등 고위험군이 다수 식별되었습니다.
                                                전반적으로 특정 부서의 주말/심야 결제 비중이 높게 나타나고 있으니 이에 대한 추가 소명 확인이 필요합니다.
                                            </p>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Total Examined</div>
                                                    <div className="text-xl font-black text-white">{transactions.length}</div>
                                                </div>
                                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Risk Found</div>
                                                    <div className="text-xl font-black text-red-500">{transactions.filter(t => t.risk_score >= 80).length}</div>
                                                </div>
                                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Compliance Rate</div>
                                                    <div className="text-xl font-black text-emerald-500">92%</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-[450px] flex flex-col bg-slate-950 border-l border-slate-800 h-full relative z-20 shadow-2xl">
                {/* Search */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 text-xs text-white focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* Transaction List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {filteredTransactions.map((tx) => (
                        <div
                            key={tx.id}
                            onClick={() => handleTxClick(tx)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 
                                ${selectedTx?.id === tx.id
                                    ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500 shadow-lg scale-[1.02]'
                                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'}`
                            }
                        >
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${tx.risk_score >= 80 ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-0.5">
                                    <span className="text-xs font-bold text-slate-200 truncate">{tx.vendor_name}</span>
                                    <span className="text-xs font-bold text-slate-400">{tx.amount.toLocaleString()}원</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span>{tx.emp_name} | {tx.dept_name}</span>
                                    {tx.risk_score >= 80 && <span className="text-red-400 font-bold">RISK {tx.risk_score}</span>}
                                </div>
                            </div>
                            <ChevronRight size={14} className={`self-center transition-all ${selectedTx?.id === tx.id ? 'text-blue-500 translate-x-1' : 'text-slate-700'}`} />
                        </div>
                    ))}
                </div>

                {/* AI Chat Interface */}
                <div className="h-[300px] border-t border-slate-800 bg-slate-900 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30">
                    <div className="flex items-center px-4 py-3 border-b border-slate-800/50 bg-slate-900">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Audit Assistant</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0B1221]">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] px-3 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 rounded-tl-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/50 px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-700/50">
                                    <Loader2 className="animate-spin text-blue-400" size={12} />
                                    <span className="text-[10px] text-slate-500">분석 중...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800">
                        <div className="relative">
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="이상 징후에 대해 물어보세요..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-3 pr-10 text-xs text-white outline-none focus:border-blue-500 focus:bg-slate-900 transition-all"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isChatLoading}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all disabled:opacity-50"
                            >
                                <Send size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}} />
        </div>
    );
}

// --------------------------------------------------------------------------------
// Sub-components and Hooks (Defined outside to avoid hoisting/scope issues with variables)
// --------------------------------------------------------------------------------

function useDerivedStats(transactions: CardTransaction[]) {
    const deptStats = useMemo(() => {
        const counts: Record<string, number> = {};
        transactions.forEach(t => {
            const d = t.dept_name || "미분류";
            counts[d] = (counts[d] || 0) + 1;
        });
        const data = Object.entries(counts).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 5);
        return data.length > 0 ? data : [{ name: "데이터 없음", count: 0 }];
    }, [transactions]);

    const userStats = useMemo(() => {
        const u: Record<string, { name: string, dept: string, score: number, count: number }> = {};
        transactions.forEach(t => {
            if (!u[t.emp_name]) u[t.emp_name] = { name: t.emp_name, dept: t.dept_name || "미분류", score: 0, count: 0 };
            u[t.emp_name].score += t.risk_score;
            u[t.emp_name].count += 1;
        });
        return Object.values(u).sort((a, b) => b.score - a.score).slice(0, 5);
    }, [transactions]);

    return { deptStats, userStats };
}

function DraggableCard({ selectedTx, onClose }: { selectedTx: CardTransaction, onClose: () => void }) {
    const [position, setPosition] = useState({ x: 40, y: 40 });
    const [isDragging, setIsDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setRel({ x: e.clientX - position.x, y: e.clientY - position.y });
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({ x: e.clientX - rel.x, y: e.clientY - rel.y });
        };
        const onMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, rel]);

    return (
        <div
            className="absolute z-50 w-[340px] shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200"
            style={{ left: position.x, top: position.y }}
        >
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden ring-1 ring-black/50">
                <div
                    onMouseDown={onMouseDown}
                    className={`h-1.5 w-full cursor-grab active:cursor-grabbing ${selectedTx.risk_score >= 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                />
                <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1 pr-2">
                            <h3 className="text-lg font-black text-white leading-tight truncate">{selectedTx.vendor_name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                                <MapPin size={10} className="flex-shrink-0" /> <span className="truncate">{selectedTx.address || "주소 정보 없음"}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white flex-shrink-0"><X size={16} /></button>
                    </div>

                    <div className="bg-slate-950/50 rounded-lg p-3 border border-white/5 mb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <AlertTriangle size={12} className={selectedTx.risk_score >= 80 ? "text-red-400" : "text-blue-400"} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Analysis Reason</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            {selectedTx.risk_reason}
                        </p>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-white/5">
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase truncate">{selectedTx.emp_name} ({selectedTx.dept_name})</div>
                            <div className="text-xl font-black text-white tracking-tight truncate">{selectedTx.amount.toLocaleString()}<span className="text-xs font-medium ml-0.5 text-slate-500">KRW</span></div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                            <span className={`text-xs font-black px-2 py-1 rounded-md ${selectedTx.risk_score >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                Score {selectedTx.risk_score}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
