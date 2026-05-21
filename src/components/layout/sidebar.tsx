'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Mail,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  wpOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mandanten', href: '/mandanten', icon: Building2, wpOnly: true },
  { label: 'Engagements', href: '/engagements', icon: Briefcase, wpOnly: true },
  { label: 'Saldenbestätigungen', href: '/sba', icon: Mail },
  { label: 'Dokumentenaustausch', href: '/pbc', icon: FolderOpen },
  { label: 'Einstellungen', href: '/settings', icon: Settings, wpOnly: true },
];

interface SidebarProps {
  role?: string;
}

const WP_ROLES = ['WP_ADMIN', 'WP_TEAM'];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isWp = WP_ROLES.includes(role ?? '');

  const visibleItems = navItems.filter((item) => !item.wpOnly || isWp);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-dataly-line bg-dataly-surface">
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-l-2',
                isActive
                  ? 'bg-dataly-surface-subtle text-dataly-navy border-dataly-blue'
                  : 'text-dataly-slate border-transparent hover:bg-dataly-surface-subtle hover:text-dataly-ink'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
