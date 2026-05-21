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
  if (rate >= 80) return '#16865a'; // dataly-success
  if (rate >= 50) return '#b7791f'; // dataly-warning
  return '#c2413d'; // dataly-danger
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
    <div className="rounded-lg border border-dataly-line bg-dataly-surface p-3 shadow-md text-xs space-y-1">
      <p className="font-semibold text-dataly-ink truncate max-w-[200px]">{d.title}</p>
      <p className="text-dataly-slate">{d.mandantName}</p>
      <div className="pt-1 space-y-0.5 text-dataly-slate">
        <p>Versandt: <span className="font-medium">{d.sent}</span></p>
        <p>Geantwortet: <span className="font-medium">{d.responded}</span></p>
        <p>Rücklaufquote: <span className="font-semibold" style={{ color: rateColor(d.responseRate) }}>{d.responseRate}%</span></p>
        {d.hasDifferences > 0 && (
          <p className="text-dataly-warning">Differenzen: {d.hasDifferences}</p>
        )}
      </div>
    </div>
  );
};

export function ResponseRateChart({ data }: ResponseRateChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-dataly-muted">
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
        <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#7a8a9e' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#7a8a9e' }}
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
