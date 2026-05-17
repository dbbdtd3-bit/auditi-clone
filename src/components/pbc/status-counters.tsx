import * as React from 'react';

interface StatusCounts {
  OPEN: number;
  UPLOADED: number;
  ACCEPTED: number;
  NEEDS_REVISION: number;
  REJECTED: number;
}

interface StatusCountersProps {
  counts: StatusCounts;
}

const STATUS_CONFIG: {
  key: keyof StatusCounts;
  label: string;
  dotClass: string;
}[] = [
  { key: 'OPEN', label: 'Offen', dotClass: 'bg-slate-400' },
  { key: 'UPLOADED', label: 'Hochgeladen', dotClass: 'bg-blue-400' },
  { key: 'ACCEPTED', label: 'Akzeptiert', dotClass: 'bg-green-500' },
  { key: 'NEEDS_REVISION', label: 'Überarbeitung', dotClass: 'bg-amber-400' },
  { key: 'REJECTED', label: 'Abgelehnt', dotClass: 'bg-red-400' },
];

export function StatusCounters({ counts }: StatusCountersProps) {
  return (
    <div className="space-y-1.5">
      {STATUS_CONFIG.map(({ key, label, dotClass }) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
          <span className="text-slate-600">{label}</span>
          <span className="font-medium text-slate-800 tabular-nums">{counts[key]}</span>
        </div>
      ))}
    </div>
  );
}
