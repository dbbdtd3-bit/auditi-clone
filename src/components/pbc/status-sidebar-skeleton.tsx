import * as React from 'react';

export function StatusSidebarSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 h-fit animate-pulse">
      {/* Tab bar */}
      <div className="flex gap-1">
        <div className="h-8 flex-1 rounded-md bg-slate-200" />
        <div className="h-8 flex-1 rounded-md bg-slate-100" />
        <div className="h-8 flex-1 rounded-md bg-slate-100" />
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-slate-200" />

      {/* Counter rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-200 shrink-0" />
            <div className="h-2.5 flex-1 rounded bg-slate-100" />
            <div className="h-2.5 w-4 rounded bg-slate-200 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
