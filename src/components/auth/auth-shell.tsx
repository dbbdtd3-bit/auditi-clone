import type { ReactNode } from 'react';
import { CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

const trustCues = [
  {
    icon: LockKeyhole,
    title: 'Sicherer Zugriff',
    text: 'Kanzlei- und Mandantenzugriffe bleiben getrennt.',
  },
  {
    icon: CheckCircle2,
    title: 'Admin-Freigabe',
    text: 'Neue Konten werden vor dem Einsatz geprüft.',
  },
  {
    icon: FileCheck2,
    title: 'Audit-Trail',
    text: 'Änderungen bleiben für die Prüfungsakte nachvollziehbar.',
  },
];

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dataly-paper px-4 py-8 text-dataly-ink">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-dataly-line bg-white shadow-[0_18px_44px_rgba(16,32,51,0.10)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="bg-dataly-navy p-8 text-white">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-semibold leading-7">Dataly</p>
                  <p className="text-sm text-white/70">Prüfungsplattform</p>
                </div>
              </div>

              <div className="space-y-5">
                {trustCues.map((cue) => {
                  const Icon = cue.icon;

                  return (
                    <div key={cue.title} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{cue.title}</p>
                        <p className="mt-1 text-sm leading-5 text-white/70">{cue.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs leading-5 text-white/60">
              Vertraulich. Rollenbasiert. Für deutsche Prüfungs- und Steuerberatungsteams.
            </p>
          </div>
        </aside>

        <section className="flex min-h-[640px] flex-col justify-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase text-dataly-teal">Dataly Zugang</p>
              <h1 className="text-[28px] font-semibold leading-9 text-dataly-ink">{title}</h1>
              <p className="mt-2 text-sm leading-[22px] text-dataly-slate">{description}</p>
            </div>

            {children}

            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
