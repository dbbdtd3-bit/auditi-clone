import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const toneClasses = {
  success: 'border-dataly-success/25 bg-dataly-success-soft text-dataly-success',
  warning: 'border-dataly-warning/30 bg-dataly-warning-soft text-dataly-warning',
  danger: 'border-dataly-danger/30 bg-dataly-danger-soft text-dataly-danger',
  info: 'border-dataly-info/25 bg-dataly-info-soft text-dataly-info',
};

interface PortalStatusCardProps {
  icon: LucideIcon;
  tone: keyof typeof toneClasses;
  title: string;
  children: ReactNode;
}

export function PortalStatusCard({ icon: Icon, tone, title, children }: PortalStatusCardProps) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-[30px] text-dataly-ink">{title}</h1>
            <div className="mt-2 space-y-2 text-sm leading-[22px] text-dataly-slate">{children}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
