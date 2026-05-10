import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatusCounts {
  OPEN: number;
  UPLOADED: number;
  ACCEPTED: number;
  NEEDS_REVISION: number;
  REJECTED: number;
}

interface StatusProgressProps {
  counts: StatusCounts;
  total: number;
}

const SEGMENT_COLORS: Record<keyof StatusCounts, string> = {
  OPEN: 'bg-slate-200',
  UPLOADED: 'bg-blue-300',
  ACCEPTED: 'bg-green-500',
  NEEDS_REVISION: 'bg-amber-400',
  REJECTED: 'bg-red-400',
};

const STATUS_ORDER: (keyof StatusCounts)[] = [
  'ACCEPTED',
  'UPLOADED',
  'NEEDS_REVISION',
  'OPEN',
  'REJECTED',
];

export function StatusProgress({ counts, total }: StatusProgressProps) {
  if (total === 0) {
    return (
      <div className="h-2 w-full rounded-full bg-slate-100" />
    );
  }

  return (
    <div className="h-2 w-full rounded-full overflow-hidden flex">
      {STATUS_ORDER.map((status) => {
        const count = counts[status];
        if (count === 0) return null;
        const width = (count / total) * 100;
        return (
          <div
            key={status}
            className={cn('h-full', SEGMENT_COLORS[status])}
            style={{ width: `${width}%` }}
            title={`${status}: ${count}`}
          />
        );
      })}
    </div>
  );
}
