import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, ComposedChart } from 'recharts';
import { MOCK_FORECAST_DATA, INITIAL_INVENTORY } from '../data/mockData';
import { SlidersHorizontal, Package, TrendingUp, Archive, Target, ShieldAlert, Settings, PlayCircle } from 'lucide-react';
import { ForecastDataPoint } from '../types';

const StatsCard = ({ icon: Icon, title, value, unit, colorClass }: { icon: any, title: string, value: string, unit: string, colorClass: string }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <span className="text-sm font-medium text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  </div>
);


const ProductionForecast: React.FC = () => {
  const [safetyStockRatio, setSafetyStockRatio] = useState(20); // in percent
  const [productionCapacity, setProductionCapacity] = useState(10000);

  const simulationResult = useMemo(() => {
    const forecastWeeks = MOCK_FORECAST_DATA.filter(d => d.demand !== undefined);
    const avgDemand = forecastWeeks.reduce((sum, d) => sum + (d.demand || 0), 0) / forecastWeeks.length;
    const targetSafetyStock = Math.round(avgDemand * (safetyStockRatio / 100));

    let currentInventory = INITIAL_INVENTORY;
    const processedData: ForecastDataPoint[] = MOCK_FORECAST_DATA.map(d => {
      if (d.sales) { // Historical data
        currentInventory = currentInventory - d.sales; // Simplified for demo
        return { ...d, inventory: currentInventory };
      }
      
      if (d.demand) { // Forecast data
        const startingInventory = currentInventory;
        const requiredProduction = d.demand + targetSafetyStock - startingInventory;
        const productionPlan = Math.min(productionCapacity, Math.max(0, requiredProduction));
        
        currentInventory = startingInventory + productionPlan - d.demand;

        return {
          ...d,
          production: Math.round(productionPlan),
          inventory: Math.round(currentInventory),
        }
      }
      return d;
    });

    const finalInventory = processedData[processedData.length - 1].inventory || 0;
    const stockShortage = processedData.reduce((shortage, d) => {
        if (d.inventory !== undefined && d.inventory < 0) {
            return shortage + Math.abs(d.inventory);
        }
        return shortage;
    }, 0);

    return {
      processedData,
      kpis: {
        avgDemand: Math.round(avgDemand),
        currentInventory: INITIAL_INVENTORY,
        targetSafetyStock,
        stockShortage: Math.round(stockShortage),
      }
    };
  }, [safetyStockRatio, productionCapacity]);

  const { processedData, kpis } = simulationResult;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">생산 관리 예측 (수요 예측 기반)</h2>
        <p className="text-slate-500 mt-1">AI 수요 예측을 바탕으로 생산 계획을 시뮬레이션하고 재고 부족 리스크를 분석합니다.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="예측 기간 평균 수요" value={kpis.avgDemand.toLocaleString()} unit="개" icon={TrendingUp} colorClass="bg-blue-500" />
        <StatsCard title="현재고" value={kpis.currentInventory.toLocaleString()} unit="개" icon={Archive} colorClass="bg-indigo-500" />
        <StatsCard title="목표 안전 재고" value={kpis.targetSafetyStock.toLocaleString()} unit="개" icon={Target} colorClass="bg-emerald-500" />
        <StatsCard title="예상 재고 부족" value={kpis.stockShortage.toLocaleString()} unit="개" icon={ShieldAlert} colorClass="bg-red-500" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Chart */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[28rem]">
              <h3 className="text-lg font-bold text-slate-900 mb-6">주간 수요-생산-재고 현황</h3>
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={processedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                  <Bar yAxisId="left" dataKey="sales" name="판매 실적" fill="#3b82f6" barSize={30} />
                  <Line yAxisId="left" type="monotone" dataKey="demand" name="수요 예측" stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="production" name="생산 계획" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }}/>
                </ComposedChart>
              </ResponsiveContainer>
           </div>
           
           {/* Data Table */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-900 mb-4">상세 데이터</h3>
             <div className="overflow-x-auto max-h-72">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">주차</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">판매 실적</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">수요 예측</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">생산 계획</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">기말 재고</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {processedData.map(d => (
                            <tr key={d.week} className={d.inventory !== undefined && d.inventory < 0 ? 'bg-red-50' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">{d.week}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">{d.sales?.toLocaleString() || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">{d.demand?.toLocaleString() || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 font-semibold text-right">{d.production?.toLocaleString() || '-'}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${d.inventory !== undefined && d.inventory < 0 ? 'text-red-600' : 'text-slate-800'}`}>{d.inventory?.toLocaleString() || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
           </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600"/>
            생산 계획 시뮬레이션
          </h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="safety-stock" className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                목표 안전 재고율
              </label>
              <div className="flex items-center gap-4">
                <input id="safety-stock" type="range" min="10" max="50" value={safetyStockRatio} onChange={(e) => setSafetyStockRatio(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                <span className="font-bold text-blue-600 w-12 text-center">{safetyStockRatio}%</span>
              </div>
            </div>
            
             <div>
              <label htmlFor="prod-capacity" className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                주간 최대 생산량 (Capacity)
              </label>
              <div className="flex items-center gap-4">
                <input id="prod-capacity" type="range" min="5000" max="15000" step="500" value={productionCapacity} onChange={(e) => setProductionCapacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                <span className="font-bold text-blue-600 w-16 text-center">{productionCapacity.toLocaleString()}</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95">
              <PlayCircle className="w-5 h-5" />
              생산 계획 최적화
            </button>
            
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
              * 슬라이더를 조절하여 목표 재고 및 생산량 변동 시 AI가 제안하는 최적의 생산 계획과 그에 따른 재고 변화를 실시간으로 확인해볼 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionForecast;