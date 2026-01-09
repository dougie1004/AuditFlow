
import React, { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, ComposedChart, Line } from 'recharts';
import { MOCK_FORECAST_DATA, INITIAL_INVENTORY } from '../data/mockData';
import { TrendingUp, Archive, Target, ShieldAlert, Settings, PlayCircle, X, Sparkles } from 'lucide-react'; // Added X icon
import type { ForecastDataPoint } from '../types';
import { AnimatePresence, motion } from 'framer-motion'; // Added for animation

const StatsCard = ({ icon: Icon, title, value, unit, colorClass }: { icon: any, title: string, value: string, unit: string, colorClass: string }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`p-2 sm:p-3 rounded-lg ${colorClass}`}>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    </div>
    <div>
      <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
      <div className="flex items-baseline">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{value}</h3>
        <span className="text-xs sm:text-sm font-medium text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  </div>
);


const ProductionForecast: React.FC = () => {
  const [safetyStockRatio, setSafetyStockRatio] = useState(20); // in percent
  const [productionCapacity, setProductionCapacity] = useState(10000);
  const [selectedChartData, setSelectedChartData] = useState<ForecastDataPoint | null>(null); // New state for selected data

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
          production: productionPlan,
          inventory: currentInventory,
        };
      }
      return d; // Should not happen with current mock data structure
    });

    const minInventory = Math.min(...processedData.filter(d => d.inventory !== undefined).map(d => d.inventory!));
    const isBelowSafetyStock = processedData.some(d => d.inventory! < targetSafetyStock);
    const highDemandWeeks = processedData.filter(d => d.demand && d.demand > avgDemand * 1.2).length;

    return {
      processedData,
      targetSafetyStock,
      minInventory,
      isBelowSafetyStock,
      highDemandWeeks,
    };
  }, [safetyStockRatio, productionCapacity]);

  const { processedData, targetSafetyStock, minInventory, isBelowSafetyStock, highDemandWeeks } = simulationResult;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <AnimatePresence>
        {selectedChartData && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedChartData(null)}
          >
            <div className="bg-white rounded-xl shadow-2xl p-6 relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedChartData(null)} className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
              <h3 className="text-xl font-bold text-slate-900 mb-4">주간 상세 정보</h3>
              <div className="space-y-3">
                <p className="text-sm text-slate-700"><strong>주차:</strong> {selectedChartData.week}</p>
                {selectedChartData.sales !== undefined && <p className="text-sm text-slate-700"><strong>실제 판매량:</strong> {selectedChartData.sales.toLocaleString()}개</p>}
                {selectedChartData.demand !== undefined && <p className="text-sm text-slate-700"><strong>예측 수요:</strong> {selectedChartData.demand.toLocaleString()}개</p>}
                {selectedChartData.production !== undefined && <p className="text-sm text-slate-700"><strong>생산 계획:</strong> {selectedChartData.production.toLocaleString()}개</p>}
                {selectedChartData.inventory !== undefined && <p className="text-sm text-slate-700"><strong>기말 재고:</strong> {selectedChartData.inventory.toLocaleString()}개</p>}

                {selectedChartData.inventory !== undefined && selectedChartData.inventory < targetSafetyStock && (
                  <p className="text-sm font-bold text-red-600 flex items-center gap-2 pt-2 border-t border-red-100">
                    <ShieldAlert className="w-5 h-5" /> 안전 재고 미달! 즉시 검토 필요
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="block">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">생산 관리 및 재고 예측 (Production & Inventory Forecast)</h2>
        <p className="text-sm sm:text-base text-slate-500 mt-1">AI 기반 수요 예측 및 최적 생산 계획 시뮬레이션</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          icon={TrendingUp}
          title="평균 주간 수요"
          value={(processedData.filter(d => d.demand !== undefined).reduce((sum, d) => sum + (d.demand || 0), 0) / processedData.filter(d => d.demand !== undefined).length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          unit="개"
          colorClass="bg-blue-500"
        />
        <StatsCard
          icon={Archive}
          title="안전 재고 목표"
          value={targetSafetyStock.toLocaleString()}
          unit="개"
          colorClass="bg-indigo-500"
        />
        <StatsCard
          icon={Target}
          title="최저 예측 재고"
          value={minInventory.toLocaleString()}
          unit="개"
          colorClass={isBelowSafetyStock ? "bg-red-500" : "bg-emerald-500"}
        />
        <StatsCard
          icon={ShieldAlert}
          title="잠재적 재고 위험 주차"
          value={isBelowSafetyStock ? highDemandWeeks.toLocaleString() : '0'}
          unit="주"
          colorClass={isBelowSafetyStock ? "bg-red-500" : "bg-slate-500"}
        />
      </div>

      {/* Chart and Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="xl:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">수요/생산/재고 예측 시뮬레이션 (단위: 개)</h3>
          <div className="h-72 sm:h-96 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={processedData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="week" scale="band" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString()}개`, name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" name="실제 판매량" fill="#8884d8" barSize={20} />
                <Bar yAxisId="left" dataKey="demand" name="예측 수요" fill="#82ca9d" barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="production" name="생산 계획" stroke="#ff7300" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, onClick: (_e: any, props: any) => setSelectedChartData(props.payload) }} />
                <Line yAxisId="right" type="monotone" dataKey="inventory" name="예측 재고" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, onClick: (_e: any, props: any) => setSelectedChartData(props.payload) }} />
                <Line yAxisId="right" type="monotone" dataKey="targetSafetyStock" name="안전 재고 목표" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Control Panel */}
        <div className="xl:col-span-1 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            시뮬레이션 설정
          </h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="safetyStock" className="block text-sm font-medium text-slate-700 mb-2">안전 재고 비율 ({safetyStockRatio}%)</label>
              <input
                id="safetyStock"
                type="range"
                min="0"
                max="50"
                value={safetyStockRatio}
                onChange={(e) => setSafetyStockRatio(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-500 mt-2">평균 수요 대비 목표 안전 재고 수준을 설정합니다.</p>
            </div>
            <div>
              <label htmlFor="productionCapacity" className="block text-sm font-medium text-slate-700 mb-2">최대 생산 능력 ({productionCapacity.toLocaleString()}개/주)</label>
              <input
                id="productionCapacity"
                type="range"
                min="5000"
                max="20000"
                step="500"
                value={productionCapacity}
                onChange={(e) => setProductionCapacity(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">주간 최대 생산 가능 수량을 설정합니다.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><PlayCircle className="w-4 h-4 text-blue-600" /> 시뮬레이션 실행</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                위 설정값을 기반으로 향후 8주간의 재고 및 생산 계획을 실시간으로 재계산합니다.
              </p>
              <button
                onClick={() => { /* re-runs useMemo, effectively re-simulates */ }}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> 예측 재실행
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionForecast;
