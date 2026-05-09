'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CampaignKpi {
  id: string;
  title: string;
  status: string;
  engagementTitle: string;
  mandantName: string;
  total: number;
  sent: number;
  responded: number;
  hasDifferences: number;
  responseRate: number;
}

interface ResponseRateChartProps {
  data: CampaignKpi[];
}

function rateColor(rate: number): string {
  if (rate >= 80) return '#10b981'; // emerald-500
  if (rate >= 50) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CampaignKpi }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-slate-800 truncate max-w-[200px]">{d.title}</p>
      <p className="text-slate-500">{d.mandantName}</p>
      <div className="pt-1 space-y-0.5">
        <p>Versandt: <span className="font-medium text-slate-700">{d.sent}</span></p>
        <p>Geantwortet: <span className="font-medium text-slate-700">{d.responded}</span></p>
        <p>Rücklaufquote: <span className="font-semibold" style={{ color: rateColor(d.responseRate) }}>{d.responseRate}%</span></p>
        {d.hasDifferences > 0 && (
          <p className="text-amber-600">Differenzen: {d.hasDifferences}</p>
        )}
      </div>
    </div>
  );
};

export function ResponseRateChart({ data }: ResponseRateChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Keine aktiven Kampagnen vorhanden
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="responseRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chartData.map((entry) => (
            <Cell key={entry.id} fill={rateColor(entry.responseRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
