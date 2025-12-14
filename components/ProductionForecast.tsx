import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MOCK_PRODUCTION_DATA } from '../data/mockData';
import { SlidersHorizontal, Package } from 'lucide-react';

const ProductionForecast: React.FC = () => {
  const [sliderValue, setSliderValue] = useState(50);

  const chartData = useMemo(() => {
    const factor = 1 + (sliderValue - 50) / 100; // -50% to +50% change
    return MOCK_PRODUCTION_DATA.map(d => ({
      ...d,
      predicted: d.predicted ? Math.round(d.predicted * factor) : undefined
    }));
  }, [sliderValue]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold text-slate-900">생산 관리 예측 (확장성 데모)</h2>
        <p className="text-slate-500 mt-1">AI를 활용한 수요 예측 및 생산량 시뮬레이션</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">월별 생산량 예측 그래프</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px'}} />
                <Line type="monotone" dataKey="actual" name="과거 실적" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" name="AI 예측" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600"/>
            시뮬레이션 컨트롤
          </h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="raw-material" className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                <Package className="w-4 h-4" />
                원자재 투입량 조절
              </label>
              <input
                id="raw-material"
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>-50%</span>
                <span>기준</span>
                <span>+50%</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                <p className="text-sm text-slate-500">예상 생산량 변화</p>
                <p className={`text-3xl font-bold mt-1 ${sliderValue > 50 ? 'text-green-600' : sliderValue < 50 ? 'text-red-600' : 'text-slate-900'}`}>
                    {sliderValue > 50 ? '+' : ''}{((sliderValue-50)*1).toFixed(0)}%
                </p>
            </div>

            <div className="text-xs text-slate-400">
              * 슬라이더를 조절하여 원자재 투입량 변동 시 AI가 예측하는 미래 생산량(점선)의 변화를 실시간으로 확인해볼 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionForecast;
