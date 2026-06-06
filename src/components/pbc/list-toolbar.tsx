'use client';

import * as React from 'react';
import { Search, LayoutTemplate, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TemplateManagerSheet } from './template-manager-sheet';
import { CreateItemDialog } from './create-item-dialog';
import { ListNotificationSettings } from './list-notification-settings';

interface ListToolbarProps {
  listId: string;
  search: string;
  onSearchChange: (v: string) => void;
  totalSelected: number;
  totalItems: number;
  onMasterCheck: (checked: boolean) => void;
  onItemsChanged: () => void;
  isWp: boolean;
}

export function ListToolbar({
  listId,
  search,
  onSearchChange,
  totalSelected,
  totalItems,
  onMasterCheck,
  onItemsChanged,
  isWp,
}: ListToolbarProps) {
  const [templateSheetOpen, setTemplateSheetOpen] = React.useState(false);

  const indeterminate = totalSelected > 0 && totalSelected < totalItems;
  const allChecked = totalItems > 0 && totalSelected === totalItems;

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        checked={indeterminate ? 'indeterminate' : allChecked}
        onCheckedChange={(checked) => onMasterCheck(!!checked)}
        aria-label="Alle auswählen"
      />

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Anforderungen suchen..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {isWp && (
        <>
          <Button
            variant="outline"
            onClick={() => setTemplateSheetOpen(true)}
            className="shrink-0"
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Vorlagen
          </Button>

          <CreateItemDialog listId={listId} />
        </>
      )}

      <ListNotificationSettings listId={listId} isWp={isWp} />

      <TemplateManagerSheet
        listId={listId}
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        onApplied={onItemsChanged}
      />
    </div>
  );
}
