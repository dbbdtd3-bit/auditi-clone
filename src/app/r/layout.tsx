import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dataly-paper text-dataly-ink">
      <header className="border-b border-dataly-line bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dataly-navy shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <span className="font-semibold text-dataly-ink">Dataly</span>
            <span className="hidden text-sm text-dataly-muted sm:inline">Antwortportal</span>
          </div>
          <span className="rounded-full border border-dataly-line bg-dataly-surface-subtle px-2.5 py-1 text-xs font-semibold text-dataly-blue">
            Sicherer Link
          </span>
        </div>
      </header>
      <main className="px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
