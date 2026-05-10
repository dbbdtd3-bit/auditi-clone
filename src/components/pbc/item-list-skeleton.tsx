import * as React from 'react';

export function ItemListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3"
        >
          <div className="h-4 w-4 rounded bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="h-2.5 w-1/3 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-slate-200 shrink-0" />
        </div>
      ))}
    </div>
  );
}
