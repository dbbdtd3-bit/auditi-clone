'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DueDatePopoverProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
}

export function DueDatePopover({ value, onChange, disabled }: DueDatePopoverProps) {
  const [open, setOpen] = React.useState(false);

  function handleSelect(date: Date | undefined) {
    onChange(date ?? null);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-slate-400'
          )}
        >
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="flex-1">
            {value ? format(value, 'dd. MMM yyyy', { locale: de }) : 'Frist setzen'}
          </span>
          {value && (
            <X
              className="h-3.5 w-3.5 ml-2 shrink-0 text-slate-400 hover:text-slate-700"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={handleSelect}
          locale={de}
        />
      </PopoverContent>
    </Popover>
  );
}
