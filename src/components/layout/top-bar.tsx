'use client';

import { signOut } from 'next-auth/react';
import { ShieldCheck, ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
  };
}

const roleLabel: Record<string, string> = {
  WP_ADMIN: 'Administrator',
  WP_TEAM: 'WP-Team',
  MANDANT_ADMIN: 'Mandant Admin',
  MANDANT_USER: 'Mandant',
};

export function TopBar({ user }: TopBarProps) {
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.email?.[0] ?? 'U').toUpperCase();

  // TODO: replace with actual firm name from organisation model once available
  const firmName = 'Kanzlei';

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-dataly-line bg-dataly-surface px-5">
      {/* Left: Logo + Firm */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-dataly-navy">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dataly-ink">Dataly</span>
          <span className="text-dataly-line-strong select-none">·</span>
          <span className="text-sm text-dataly-slate">{firmName}</span>
        </div>
      </div>

      {/* Middle: reserved for Global Search V1.1 */}
      <div className="flex-1" />

      {/* Right: User */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-8 px-2 text-dataly-slate hover:bg-dataly-surface-subtle hover:text-dataly-ink"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-dataly-navy text-white text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-dataly-ink">
              {user.name || user.email}
            </span>
            {user.role && (
              <span className="text-xs text-dataly-muted hidden sm:inline">
                {roleLabel[user.role] || user.role}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-dataly-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              Einstellungen
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-dataly-danger focus:text-dataly-danger cursor-pointer"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
