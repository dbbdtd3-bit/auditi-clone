'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Mail,
  FolderOpen,
  LogOut,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string;
}

const mainNav: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Mandanten',
    href: '/mandanten',
    icon: Building2,
  },
  {
    label: 'Engagements',
    href: '/engagements',
    icon: Briefcase,
  },
];

const featureNav: NavItem[] = [
  {
    label: 'Saldenbestätigungen',
    href: '/sba',
    icon: Mail,
  },
  {
    label: 'Dokumentenaustausch',
    href: '/pbc',
    icon: FolderOpen,
  },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

export function Sidebar({ userName, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const isWp = WP_ROLES.includes(userRole ?? '');

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabel: Record<string, string> = {
    WP_ADMIN: 'Administrator',
    WP_TEAM: 'WP-Team',
    MANDANT_ADMIN: 'Mandant Admin',
    MANDANT_USER: 'Mandant',
  };

  return (
    <aside className="flex h-screen w-60 flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-white">Auditi</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5">Prüfungsplattform</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Übersicht
        </p>
        {mainNav.filter((item) => isWp || item.href === '/dashboard').map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <Separator className="my-3 bg-slate-700" />

        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Module
        </p>
        {featureNav.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="group relative"
                title={item.badge}
              >
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium cursor-not-allowed',
                    'text-slate-600'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] font-medium bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                      Bald
                    </span>
                  )}
                </div>
              </div>
            );
          }

          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-2">
        <Separator className="mb-3 bg-slate-700" />
        {(() => {
          const isActive = pathname === '/settings' || pathname.startsWith('/settings/');
          return (
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Einstellungen
            </Link>
          );
        })()}
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName || 'Benutzer'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {userRole ? roleLabel[userRole] || userRole : userEmail || ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
