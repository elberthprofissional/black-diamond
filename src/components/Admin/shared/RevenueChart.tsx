import { useState, type FC } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  LineChart,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { RevenueChartData } from '../../../hooks/useRevenueChartData';

interface RevenueChartProps {
  data: RevenueChartData;
}

interface TooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-4 py-3 shadow-2xl shadow-black/50">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-[12px]">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-bold text-white">R$ {Number(entry.value).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
};

const RevenueChart: FC<RevenueChartProps> = ({ data }) => {
  const [chartMode, setChartMode] = useState<'daily' | 'monthly' | 'comparison' | 'dayOfWeek'>(
    'daily'
  );

  const formatYAxis = (value: number) => {
    if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
    return `R$${value}`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-[#D4AF37]" />
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
              Média Diária
            </span>
          </div>
          <p className="text-lg font-black text-white tabular-nums">
            R$ {data.dailyAverage.toFixed(0)}
          </p>
        </div>

        {data.bestDay && (
          <div className="bg-[#111111] border border-white/5 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                Melhor Dia
              </span>
            </div>
            <p className="text-lg font-black text-emerald-400 tabular-nums">
              R$ {data.bestDay.value.toFixed(0)}
            </p>
            <p className="text-[9px] text-zinc-600">{data.bestDay.label}</p>
          </div>
        )}
      </div>

      {/* Chart Tabs */}
      <div className="flex gap-2 border-b border-white/[0.04] pb-3">
        {[
          { key: 'daily' as const, label: 'Diário (mês)' },
          { key: 'monthly' as const, label: 'Semanal' },
          { key: 'dayOfWeek' as const, label: 'Dia da Semana' },
          { key: 'comparison' as const, label: 'Comparação Mensal' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setChartMode(tab.key)}
            className={`relative px-4 py-2 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-lg ${
              chartMode === tab.key
                ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {chartMode === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37] rounded-full" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bar Chart - Daily */}
      {chartMode === 'daily' && (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Faturamento Diário —{' '}
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                  interval={2}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar
                  dataKey="value"
                  name="Faturamento"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  fill="#D4AF37"
                  opacity={0.85}
                  activeBar={{ opacity: 1, fill: '#D4B06A' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Chart - Weekly */}
      {chartMode === 'monthly' && (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Faturamento Semanal
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar
                  dataKey="value"
                  name="Faturamento"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fill="#D4AF37"
                  opacity={0.85}
                  activeBar={{ opacity: 1, fill: '#D4B06A' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Chart - Day of Week */}
      {chartMode === 'dayOfWeek' && (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Faturamento por Dia da Semana
            </h3>
            {data.dayOfWeekRevenue.length > 0 && (
              <span className="text-[10px] text-zinc-500">
                Melhor:{' '}
                <span className="text-[#D4AF37] font-bold">
                  {
                    data.dayOfWeekRevenue.reduce((best, curr) =>
                      curr.value > best.value ? curr : best
                    ).label
                  }
                </span>
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.dayOfWeekRevenue}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0]?.payload;
                    if (!entry) return null;
                    return (
                      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-xl px-4 py-3 shadow-2xl shadow-black/50">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                          {entry.label}
                        </p>
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="text-zinc-300">Receita:</span>
                          <span className="font-bold text-white">
                            R$ {Number(entry.value).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5">
                          <span className="text-zinc-500">Atendimentos:</span>
                          <span className="font-medium text-zinc-300">{entry.count}</span>
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="value" name="Receita" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {data.dayOfWeekRevenue.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={
                        entry.value === Math.max(...data.dayOfWeekRevenue.map((d) => d.value))
                          ? '#D4AF37'
                          : 'rgba(197,160,89,0.3)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Line Chart - Monthly Comparison */}
      {chartMode === 'comparison' && (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              Comparação Mensal
            </h3>
            {data.monthlyComparison.length >= 2 && (
              <div className="flex items-center gap-1.5">
                {(data.monthlyComparison[data.monthlyComparison.length - 1]?.value ?? 0) >=
                (data.monthlyComparison[data.monthlyComparison.length - 2]?.value ?? 0) ? (
                  <TrendingUp size={14} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={14} className="text-red-500" />
                )}
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    (data.monthlyComparison[data.monthlyComparison.length - 1]?.value ?? 0) >=
                    (data.monthlyComparison[data.monthlyComparison.length - 2]?.value ?? 0)
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}
                >
                  {data.monthlyComparison.length >= 2
                    ? `${(
                        (((data.monthlyComparison[data.monthlyComparison.length - 1]?.value ?? 0) -
                          (data.monthlyComparison[data.monthlyComparison.length - 2]?.value ?? 0)) /
                          ((data.monthlyComparison[data.monthlyComparison.length - 2]?.value ??
                            0) ||
                            1)) *
                        100
                      ).toFixed(0)}%`
                    : ''}
                </span>
              </div>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.monthlyComparison}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 9, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Faturamento"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ fill: '#D4AF37', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#D4B06A', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
