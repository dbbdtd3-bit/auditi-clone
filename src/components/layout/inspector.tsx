import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InspectorProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Inspector({ title, children, onClose, className }: InspectorProps) {
  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col border-l border-dataly-line bg-dataly-surface',
        className
      )}
    >
      <div className="flex h-11 items-center justify-between border-b border-dataly-line px-4">
        <span className="text-sm font-semibold text-dataly-ink">{title}</span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-dataly-muted hover:text-dataly-ink hover:bg-dataly-surface-subtle"
            onClick={onClose}
            aria-label="Inspector schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
