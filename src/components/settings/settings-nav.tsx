'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  isAdmin: boolean;
}

export function SettingsNav({ isAdmin }: Props) {
  const pathname = usePathname();

  const tabs = [
    { href: '/settings/team', label: 'Teamprofil', adminOnly: false },
    { href: '/settings/security', label: 'Login & Sicherheit', adminOnly: true },
    { href: '/settings/audit-log', label: 'Änderungsmanagement', adminOnly: true },
  ];

  return (
    <nav className="mt-4 flex gap-1">
      {tabs
        .filter((t) => !t.adminOnly || isAdmin)
        .map((t) => {
          const isActive = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-dataly-surface-subtle text-dataly-ink'
                  : 'text-dataly-slate hover:bg-dataly-surface-subtle hover:text-dataly-ink'
              )}
            >
              {t.label}
            </Link>
          );
        })}
    </nav>
  );
}
