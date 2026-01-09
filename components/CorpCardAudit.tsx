
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MOCK_CORP_CARD_TRANSACTIONS } from '../data/mockData';
import { CorpCardTransaction, AnomalyType } from '../types';
import { AlertTriangle, Users, User, Filter, MapPin, Sparkles, Send, Settings, CheckCircle2, Home, Store, Eraser, Info, ExternalLink, XCircle, Lock, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

declare global {
    interface Window {
        google: any;
        gm_authFailure?: () => void;
    }
}

type AuditMode = 'individual' | 'department' | 'ai-analysis';
type Department = '영업' | 'R&D' | '마케팅';

const DEPARTMENTS: Department[] = ['영업', 'R&D', '마케팅'];

const ANOMALY_COLORS: { [key in Exclude<AnomalyType, null>]: string } = {
    '자택 근처 사용': '#ef4444',
    '주말/심야 사용': '#f97316',
    '한도 초과': '#a855f7',
    '쪼개기 결제 의심': '#ec4899',
    '유흥업소 사용 의심': '#8b5cf6',
    '사적 사용 의심': '#10b981', // New anomaly color
};
const ANOMALY_TYPES = Object.keys(ANOMALY_COLORS) as Exclude<AnomalyType, null>[];

// --- Department View Component ---
const DepartmentDashboard: React.FC<{ department: Department, transactions: CorpCardTransaction[] }> = ({ department, transactions }) => {

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const anomalyCount = transactions.filter(t => t.anomaly).length;

    const anomalyData = useMemo(() => {
        const counts = transactions.reduce((acc, t) => {
            if (t.anomaly) {
                acc[t.anomaly] = (acc[t.anomaly] || 0) + 1;
            }
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
    }, [transactions]);

    return (
        <div className="w-full h-full bg-slate-50 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{department}팀 법인카드 분석</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <p className="text-sm text-slate-500">총 사용 금액</p>
                    <p className="text-xl sm:text-2xl font-bold">{(totalSpent).toLocaleString()}원</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <p className="text-sm text-slate-500">총 거래 건수</p>
                    <p className="text-xl sm:text-2xl font-bold">{transactions.length}건</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 bg-red-50">
                    <p className="text-sm text-red-600">AI 탐지 이상건수</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-700">{anomalyCount}건</p>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border h-72 sm:h-80">
                <h3 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg text-slate-800">이상 거래 유형 분석</h3>
                {anomalyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={anomalyData} layout="vertical" margin={{ top: 0, right: 20, bottom: 20, left: 60 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                            <Bar dataKey="count" barSize={15}>
                                {anomalyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={ANOMALY_COLORS[entry.name as Exclude<AnomalyType, null>] || '#ccc'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">선택된 필터에 해당하는 이상 거래가 없습니다.</div>
                )}
            </div>
        </div>
    );
};

// --- Google Map Component ---
const GoogleMapViewer: React.FC<{
    apiKey: string;
    homeLocation: { lat: number, lng: number };
    merchantLocation: { lat: number, lng: number };
    merchantName: string;
    onAuthError: () => void;
}> = ({ apiKey, homeLocation, merchantLocation, merchantName, onAuthError }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);

    // 1. Load Script
    useEffect(() => {
        if (!apiKey) return;

        // Global handler for Auth Failures
        window.gm_authFailure = () => {
            console.error("Google Maps Auth Failure");
            onAuthError();
        };

        if (window.google && window.google.maps) {
            setIsMapReady(true);
            return;
        }

        const existingScript = document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`);
        if (existingScript) {
            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    setIsMapReady(true);
                    clearInterval(checkInterval);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => {
            console.error("Google Maps Script failed to load");
            onAuthError();
        };
        document.head.appendChild(script);

    }, [apiKey, onAuthError]);

    // 2. Initialize/Update Map
    useEffect(() => {
        if (!isMapReady || !mapContainerRef.current || !window.google) return;

        if (!mapInstanceRef.current) {
            try {
                mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
                    center: merchantLocation,
                    zoom: 13,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                });
            } catch (e) {
                console.error("Map init error:", e);
            }
        } else {
            mapInstanceRef.current.panTo(merchantLocation);
            mapInstanceRef.current.setZoom(13);
        }

        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const map = mapInstanceRef.current;

        const homeMarker = new window.google.maps.Marker({
            position: homeLocation,
            map,
            title: '자택',
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            },
            label: { text: 'H', color: 'white', fontWeight: 'bold', fontSize: '10px' }
        });
        markersRef.current.push(homeMarker);

        const merchantMarker = new window.google.maps.Marker({
            position: merchantLocation,
            map,
            title: merchantName,
            animation: window.google.maps.Animation.DROP,
            icon: {
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            },
            label: { text: '!', color: 'white', fontWeight: 'bold', fontSize: '12px', className: 'mb-4' }
        });
        markersRef.current.push(merchantMarker);

        const line = new window.google.maps.Polyline({
            path: [homeLocation, merchantLocation],
            geodesic: true,
            strokeColor: '#ef4444',
            strokeOpacity: 0.4,
            strokeWeight: 2,
            icons: [{
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                offset: '50%',
                repeat: '50px'
            }],
            map
        });
        markersRef.current.push(line);

        const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding:5px; color:black"><strong>${merchantName}</strong><br/>사용처</div>`
        });
        infoWindow.open(map, merchantMarker);
        markersRef.current.push(infoWindow);

    }, [isMapReady, homeLocation, merchantLocation, merchantName]);

    return <div ref={mapContainerRef} className="w-full h-full rounded-xl bg-slate-100 min-h-[300px] md:min-h-[400px]" style={{ minHeight: '100%' }} />;
};

interface CorpCardAuditProps {
    isAuditComplete: boolean;
}

const CorpCardAudit: React.FC<CorpCardAuditProps> = ({ isAuditComplete }) => {
    const [auditMode, setAuditMode] = useState<AuditMode>('individual');
    const [selectedDept, setSelectedDept] = useState<Department>('영업');
    const [selectedTxn, setSelectedTxn] = useState<CorpCardTransaction>(MOCK_CORP_CARD_TRANSACTIONS[0]);
    const [homeAddress, setHomeAddress] = useState(selectedTxn.employee.homeAddress);
    const [selectedAnomalies, setSelectedAnomalies] = useState<Exclude<AnomalyType, null>[]>([]);
    const [transactions] = useState<CorpCardTransaction[]>(MOCK_CORP_CARD_TRANSACTIONS);
    const [analysisPrompt, setAnalysisPrompt] = useState('');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Map State
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState(() => localStorage.getItem('google_maps_api_key') || '');
    const [tempApiKey, setTempApiKey] = useState('');
    const [mapError, setMapError] = useState<string | null>(null);

    const handleApiKeySave = () => {
        if (tempApiKey) {
            setMapError(null); // Clear previous errors
            setGoogleMapsApiKey(tempApiKey);
            localStorage.setItem('google_maps_api_key', tempApiKey);
        }
    };

    const handleApiKeyReset = () => {
        setGoogleMapsApiKey('');
        setTempApiKey('');
        setMapError(null);
        localStorage.removeItem('google_maps_api_key');
        // Fix: If map script is already loaded, reloading might not clear existing instances.
        // Better to just ensure the map component receives an empty key.
    };

    const handleMapAuthError = () => {
        setMapError("Google Maps 로드 실패: API 키가 유효하지 않거나 'Maps JavaScript API'가 활성화되지 않았습니다. 콘솔 로그를 확인하세요.");
        setGoogleMapsApiKey(''); // Reset to allow re-entry
        localStorage.removeItem('google_maps_api_key');
    };

    const handleAnomalyFilterToggle = (anomaly: Exclude<AnomalyType, null>) => {
        setSelectedAnomalies(prev => {
            if (prev.includes(anomaly)) {
                return prev.filter(a => a !== anomaly);
            } else {
                return [...prev, anomaly];
            }
        });
    };

    const filteredTransactions = useMemo(() => {
        if (auditMode === 'ai-analysis') {
            // More sophisticated AI filtering logic for demo:
            // Prioritize specific anomalies, high amounts, or new '사적 사용 의심'
            return transactions.filter(t =>
                (t.anomaly as string) === '유흥업소 사용 의심' ||
                (t.anomaly as string) === '쪼개기 결제 의심' ||
                (t.anomaly as string) === '사적 사용 의심' || // Include new anomaly
                (t.amount > 300000 && t.anomaly) || // Any high amount anomaly
                (t.category === '쇼핑' && (t.anomaly as string) === '사적 사용 의심') // Specific example
            ).slice(0, 8); // Limit for display
        }
        if (auditMode === 'department') {
            let deptTransactions = transactions.filter(t => t.employee.department === selectedDept);
            if (selectedAnomalies.length > 0) {
                deptTransactions = deptTransactions.filter(t => t.anomaly && selectedAnomalies.includes(t.anomaly));
            }
            return deptTransactions;
        }
        return transactions.filter(t => t.employee.id === selectedTxn.employee.id);
    }, [auditMode, selectedDept, selectedAnomalies, transactions, selectedTxn.employee.id]);

    const handleSelectTransaction = (txn: CorpCardTransaction) => {
        setSelectedTxn(txn);
        setHomeAddress(txn.employee.homeAddress);
    }

    const handleAnalyzeRequest = () => {
        if (!analysisPrompt.trim()) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAuditMode('ai-analysis'); // Switch to AI analysis mode

        // Simulate AI processing and results
        setTimeout(() => {
            setIsAnalyzing(false);
            let resultText = `"${analysisPrompt}"에 대한 AI 분석 결과입니다.\n`;
            const relevantTxns = filteredTransactions.filter(t => t.anomaly);

            if (relevantTxns.length > 0) {
                resultText += `**${relevantTxns.length}건**의 관련 이상 징후 패턴이 식별되어 필터링되었습니다. 특히 `;
                const topAnomaly = relevantTxns[0].anomaly;
                if (topAnomaly) {
                    resultText += `'${topAnomaly}' 유형의 거래가 주요 위반 사항으로 확인됩니다. `;
                }
                if (analysisPrompt.includes('심야') || analysisPrompt.includes('주말')) {
                    resultText += `심야 및 주말 사용 패턴에 대한 추가 검토가 필요합니다.`;
                }
                if (analysisPrompt.includes('상품권') || analysisPrompt.includes('사적')) {
                    resultText += `사적 사용 의심 거래가 발견되었으니 정밀 조사를 진행하십시오.`;
                }
                // Select the most prominent or a specific risky transaction for map display
                const mapTxn = relevantTxns.find(t => t.anomaly === '쪼개기 결제 의심' || t.anomaly === '유흥업소 사용 의심' || t.anomaly === '자택 근처 사용') || relevantTxns[0];
                handleSelectTransaction(mapTxn);
            } else {
                resultText += `요청하신 조건에 부합하는 특정 이상 징후를 발견하지 못했습니다. 다른 키워드를 시도해보세요.`;
            }
            setAnalysisResult(resultText);

        }, 1500); // Increased simulation time
    };

    // --- Empty State View ---
    if (!isAuditComplete) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-slate-50">
                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 max-w-sm sm:max-w-md md:max-w-xl w-full">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">법인카드 데이터가 없습니다.</h2>
                    <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8 leading-relaxed">
                        AI 감사 분석이 완료되어야 카드 사용 내역을 조회할 수 있습니다.<br />
                        데이터 업로드 메뉴에서 감사를 실행해주세요.
                    </p>
                    <div className="flex justify-center">
                        <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
                            상태: 데이터 대기 중
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Top: AI Analysis Prompt */}
            <div className="bg-white border-b border-slate-200 p-3 sm:p-4 shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 relative w-full sm:w-auto">
                        <input
                            type="text"
                            value={analysisPrompt}
                            onChange={(e) => setAnalysisPrompt(e.target.value)}
                            placeholder="분석하고 싶은 내용을 입력하세요 (예: 강남구 심야 시간대 50만원 이상 결제 건 분석해줘)"
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm transition-all focus:bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeRequest()}
                        />
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                        onClick={handleAnalyzeRequest}
                        disabled={isAnalyzing}
                        className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isAnalyzing ? 'AI 분석 중...' : 'AI 분석 요청'}
                    </button>
                </div>
                {analysisResult && (
                    <div className="max-w-4xl mx-auto mt-3 sm:mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 sm:p-4 animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-indigo-900 whitespace-pre-wrap flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            {analysisResult}
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel */}
                <div className="w-full md:w-1/3 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden">
                    <div className="p-3 sm:p-4 border-b">
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => { setAuditMode('individual'); setSelectedAnomalies([]); }} className={`flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm p-2 rounded-md transition-all ${auditMode === 'individual' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><User className="w-4 h-4" /> 직원별</button>
                            <button onClick={() => { setAuditMode('department'); }} className={`flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm p-2 rounded-md transition-all ${auditMode === 'department' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><Users className="w-4 h-4" /> 부서별</button>
                            {auditMode === 'ai-analysis' && (
                                <button className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm p-2 rounded-md bg-indigo-100 text-indigo-700 font-bold shadow"><Sparkles className="w-4 h-4" /> AI 결과</button>
                            )}
                        </div>
                    </div>

                    {auditMode === 'department' ? (
                        <>
                            <div className="p-3 sm:p-4 border-b">
                                <h2 className="font-bold text-sm sm:text-base">감사 대상 부서 선택</h2>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {DEPARTMENTS.map(dept => (
                                        <button key={dept} onClick={() => setSelectedDept(dept)} className={`text-xs sm:text-sm p-2 rounded-md border transition-colors ${selectedDept === dept ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}>{dept}팀</button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-3 sm:p-4 border-b">
                                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-800"><Filter className="w-4 h-4 text-slate-500" />이상 거래 유형 필터</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSelectedAnomalies([])}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${selectedAnomalies.length === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        전체
                                    </button>
                                    {ANOMALY_TYPES.map(anomaly => (
                                        <button
                                            key={anomaly}
                                            onClick={() => handleAnomalyFilterToggle(anomaly)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${selectedAnomalies.includes(anomaly) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                            {anomaly}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 sm:p-4 border-b bg-slate-50/50">
                            <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                                {auditMode === 'ai-analysis' ? <Sparkles className="w-4 h-4 text-indigo-600" /> : null}
                                {auditMode === 'ai-analysis' ? 'AI 추출 의심 거래' : '감사 대상 임직원 정보'}
                            </h2>
                            <div className="mt-2 space-y-2">
                                <input type="text" placeholder="사원명" value={selectedTxn.employee.name} readOnly className="w-full p-2 border rounded bg-white text-sm font-medium text-slate-700" />
                                <input type="text" placeholder="거주지 주소" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} className="w-full p-2 border rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        <h3 className="font-bold p-3 sm:p-4 sticky top-0 bg-white border-b text-xs sm:text-sm text-slate-500 uppercase tracking-wider">
                            {auditMode === 'ai-analysis' ? 'AI Filtered Transactions' : 'Transaction List'}
                        </h3>
                        {filteredTransactions.map(txn => (
                            <button key={txn.id} onClick={() => handleSelectTransaction(txn)} className={`w-full text-left p-3 sm:p-4 border-b hover:bg-slate-50 transition-colors ${selectedTxn.id === txn.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-sm">{auditMode !== 'individual' ? `${txn.employee.name} - ${txn.merchant}` : txn.merchant}</p>
                                    <p className="font-bold text-sm">{(txn.amount).toLocaleString()}원</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                                    <span>{new Date(txn.timestamp).toLocaleString('ko-KR')}</span>
                                    {txn.anomaly && <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded"><AlertTriangle className="w-3 h-3" />{txn.anomaly}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Map */}
                <div className="w-full md:w-2/3 h-full relative overflow-hidden bg-slate-200">
                    {auditMode !== 'department' ? (
                        <>
                            {googleMapsApiKey && !mapError ? (
                                <div className="w-full h-full relative">
                                    <GoogleMapViewer
                                        apiKey={googleMapsApiKey}
                                        homeLocation={selectedTxn.employee.homeLocation}
                                        merchantLocation={selectedTxn.location}
                                        merchantName={selectedTxn.merchant}
                                        onAuthError={handleMapAuthError}
                                    />
                                    {/* Overlay Controls */}
                                    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
                                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-xs flex flex-col gap-2 border border-slate-200 w-fit">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                                                <span className="font-bold text-slate-700">자택 (Home)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                                                <span className="font-bold text-slate-700">사용처 (Merchant)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 z-10">
                                        <button
                                            onClick={handleApiKeyReset}
                                            className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 hover:text-red-600 border border-slate-200 shadow-md flex items-center gap-1 transition-colors"
                                        >
                                            <Eraser className="w-3 h-3" />
                                            API Key 초기화
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Map Placeholder */}
                                    <div
                                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                                        style={{
                                            backgroundImage: 'url("https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80")',
                                            filter: 'blur(8px)',
                                            transform: 'scale(1.1)'
                                        }}
                                    />

                                    {/* Overlay Message */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 p-4">
                                        <div className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-white max-w-sm md:max-w-md text-center w-full">
                                            <div className="bg-blue-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                                            </div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">지도 시각화 (Google Maps)</h3>

                                            {/* Error Message if present */}
                                            {mapError && (
                                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                                                    <p className="text-xs text-red-700 font-bold flex items-center gap-1 mb-1">
                                                        <XCircle className="w-3 h-3" /> 설정 오류
                                                    </p>
                                                    <p className="text-xs text-red-600">{mapError}</p>
                                                </div>
                                            )}

                                            <p className="text-slate-600 mb-4 sm:mb-6 text-sm">
                                                Google Maps API 키를 입력하면<br />
                                                <span className="font-bold text-blue-600">직원 자택</span>과 <span className="font-bold text-red-600">거래처 위치</span>를 지도에서 확인할 수 있습니다.

                                                <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200 text-left space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <div>
                                                            <strong>필수 설정 (Maps JavaScript API):</strong><br />
                                                            Places API만으로는 지도가 표시되지 않습니다. Google Cloud Console에서 'Maps JavaScript API'를 활성화해주세요.
                                                        </div>
                                                    </div>
                                                    <a
                                                        href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block w-full py-1.5 bg-yellow-100 text-center text-yellow-800 font-bold rounded hover:bg-yellow-200 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        활성화 페이지 바로가기 <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </p>

                                            <div className="relative mb-4">
                                                <input
                                                    type="password"
                                                    value={tempApiKey}
                                                    onChange={(e) => setTempApiKey(e.target.value)}
                                                    placeholder="Enter Google Maps API Key"
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-inner"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleApiKeySave();
                                                    }}
                                                />
                                                <button
                                                    onClick={handleApiKeySave}
                                                    disabled={!tempApiKey}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                                                >
                                                    적용
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mb-6">* 입력된 API Key는 브라우저(LocalStorage)에만 저장됩니다.</p>

                                            <div className="bg-slate-50 rounded-lg p-3 text-left border border-slate-200">
                                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                                                    <span className="text-xs font-bold text-slate-500">거래 정보 요약</span>
                                                    <span className="text-xs text-blue-600 font-bold">{selectedTxn.merchant}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-slate-600 flex justify-between"><span>주소:</span> <span className="font-medium text-slate-800">{selectedTxn.location.address}</span></p>
                                                    <p className="text-xs text-slate-600 flex justify-between"><span>금액:</span> <span className="font-medium text-slate-800">{(selectedTxn.amount).toLocaleString()}원</span></p>
                                                    {selectedTxn.anomaly && (
                                                        <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1 justify-end">
                                                            <AlertTriangle className="w-3 h-3" /> {selectedTxn.anomaly}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <DepartmentDashboard department={selectedDept} transactions={filteredTransactions} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CorpCardAudit;